angular.module('app', []).controller('filesController', ($http, $scope) => {

  function init() {
    $http.get('api/files').then(({ data: files }) => {
      $scope.files = files;
    });
  }

  getToken = () => $http.get('api/token').then(({ data: token }) => token);

  $scope.openFile = (fileName) => {
    getToken().then(token => {
      let href = `ms-word:ofe|u|${window.location.origin}/dav/token/${token}/${fileName}`;
      let link = angular.element(`<a href="${href}">`);
      link[0].click();
    });
  };

  init();
});
