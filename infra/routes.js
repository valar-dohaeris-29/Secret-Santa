function handler(event) {
  var request = event.request;
  if (request.headers.host.value === 'santa.deuel.pro') {
    var query = [];
    for (var key in request.querystring) {
      var values = request.querystring[key].multiValue || [request.querystring[key]];
      for (var i = 0; i < values.length; i++) query.push(key + '=' + values[i].value);
    }
    return {statusCode: 308, statusDescription: 'Permanent Redirect', headers: {location: {value: 'https://www.santa.deuel.pro' + request.uri + (query.length ? '?' + query.join('&') : '')}}};
  }
  // Rewrite only SPA routes. Never turn API errors into HTML.
  if (request.uri === '/' || request.uri === '/admin' || request.uri.indexOf('/admin/') === 0 || request.uri.indexOf('/s/') === 0) request.uri = '/index.html';
  return request;
}
