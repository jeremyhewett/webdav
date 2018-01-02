angular.module('app', []).controller('filesController', ($http, $scope) => {

  const appByExtension = {
    '.doc': 'ms-word',
    '.docx': 'ms-word',
    '.xls': 'ms-excel',
    '.xlsx': 'ms-excel',
    '.pptx': 'ms-powerpoint'
  };

  function init() {
    $http.get('api/files').then(({ data: files }) => {
      $scope.files = files;
    });
  }

  getToken = () => $http.get('api/token').then(({ data: token }) => token);

  $scope.openFile = (fileName) => {
    getToken().then(token => {
      let ext = fileName.substr(fileName.lastIndexOf('.'));
      let href = `${appByExtension[ext]}:ofe|u|${window.location.origin}/dav/token/${token}/${fileName}`;
      let link = angular.element(`<a href="${href}">`);
      link[0].click();
    });
  };

  init();
});
