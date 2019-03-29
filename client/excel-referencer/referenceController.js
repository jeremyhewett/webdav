angular.module('app').controller('referenceController', function($http, $scope, $timeout) {

  function init() {
    $http.get('/api/files').then(function(response) {
      $scope.files = response.data.filter(file => file.endsWith('.xlsx'));
    });
    loadReferences();
  }

  function selectFile(fileName) {
    return $http.get('/api/select/' + fileName).then(function(response) {
      return response.data;
    });
  }

  $scope.addReference = (fileName) => {
    selectFile(fileName).then(function(reference) {
      let href = 'ms-excel:ofe|u|' + window.location.origin + '/dav/' + reference.token + '/' + reference.tempFile;
      let link = angular.element(`<a href="${href}">`);
      link[0].click();
      pollFor(reference);
    });
  };

  function pollFor(reference) {
    $http.get('/api/reference/' + reference.id).then(function(response) {
      loadReferences();
    }, function(err) {
      $timeout(() => {
        pollFor(reference);
      }, 1000);
    });
  }

  function loadReferences() {
    $http.get(`/api/references`).then(function (response) {
      $scope.references = response.data;
    });
  }

  $scope.openReference = (reference) => {
    return $http.get(`/api/reference/${reference.id}/open`).then(({ data: reference }) => {
      let href = 'ms-excel:ofe|u|' + window.location.origin + '/dav/' + reference.token + '/' + reference.tempFile;
      let link = angular.element(`<a href="${href}">`);
      link[0].click();
    });
  };

  $scope.toViewModel = (ref) => `${ref.fileName} Sheet ${ref.workbookView.activeTab ? parseInt(ref.workbookView.activeTab) + 1 : 1} ${ref.sheetView.selection[0].$.sqref}`;

  init();
});
