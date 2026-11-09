import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
export class DynamoStore {
  constructor(table = process.env.TABLE_NAME) {
    this.table = table;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }
  async get(pk, sk) {
    return (
      await this.client.send(
        new GetCommand({
          TableName: this.table,
          Key: { pk, sk },
          ConsistentRead: true,
        }),
      )
    ).Item;
  }
  async put(item, version) {
    await this.client.send(
      new PutCommand({
        TableName: this.table,
        Item: item,
        ConditionExpression:
          version === undefined ? "attribute_not_exists(pk)" : "version = :v",
        ...(version === undefined
          ? {}
          : { ExpressionAttributeValues: { ":v": version } }),
      }),
    );
  }
  async delete(pk, sk) {
    await this.client.send(
      new DeleteCommand({ TableName: this.table, Key: { pk, sk } }),
    );
  }
  async lists() {
    let result = [],
      key;
    do {
      const page = await this.client.send(
        new QueryCommand({
          TableName: this.table,
          KeyConditionExpression: "pk = :p",
          ExpressionAttributeValues: { ":p": "LIST" },
          ConsistentRead: true,
          ExclusiveStartKey: key,
        }),
      );
      result.push(...page.Items);
      key = page.LastEvaluatedKey;
    } while (key);
    return result;
  }
  async attempt(key, expires) {
    const r = await this.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { pk: "RATE", sk: key },
        UpdateExpression: "SET expires = :e ADD attempts :one",
        ExpressionAttributeValues: { ":e": expires, ":one": 1 },
        ReturnValues: "UPDATED_NEW",
      }),
    );
    return r.Attributes.attempts;
  }
}
// Tests only; development and production use DynamoDB for durability.
export class MemoryStore {
  items = new Map();
  async get(pk, sk) {
    return structuredClone(this.items.get(`${pk}/${sk}`));
  }
  async put(item, version) {
    const key = `${item.pk}/${item.sk}`,
      old = this.items.get(key);
    if (version === undefined ? !!old : old?.version !== version)
      throw Object.assign(new Error(), {
        name: "ConditionalCheckFailedException",
      });
    this.items.set(key, structuredClone(item));
  }
  async delete(pk, sk) {
    this.items.delete(`${pk}/${sk}`);
  }
  async lists() {
    return structuredClone(
      [...this.items.values()].filter((x) => x.pk === "LIST"),
    );
  }
  async attempt(key, expires) {
    const k = `RATE/${key}`,
      count = (this.items.get(k)?.attempts || 0) + 1;
    this.items.set(k, { attempts: count, expires });
    return count;
  }
}
