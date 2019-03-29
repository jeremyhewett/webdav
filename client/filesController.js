angular.module('app').controller('filesController', function($http, $scope) {

  var appByExtension = {
    '.doc': 'ms-word',
    '.docx': 'ms-word',
    '.xls': 'ms-excel',
    '.xlsx': 'ms-excel',
    '.pptx': 'ms-powerpoint'
  };

  function init() {
    $http.get('api/files').then(function(response) {
      $scope.files = response.data;
    });
  }

  function getToken(fileName) {
    return $http.get('api/token/' + fileName).then(function(response) {
      return response.data;
    });
  }

  $scope.openFile = function(fileName) {
    getToken(fileName).then(function(token) {
      var ext = fileName.substr(fileName.lastIndexOf('.'));
      var href = appByExtension[ext] + ':ofe|u|' + window.location.origin + '/dav/' + token + '/' + fileName;
      var link = angular.element('<a href="' + href + '">');
      link[0].click();
    });
  };

  init();
});
