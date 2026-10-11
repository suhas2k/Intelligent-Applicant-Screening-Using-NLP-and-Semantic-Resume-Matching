(function () {
  'use strict';

  angular
    .module('screeningApp')
    .directive('fileModel', fileModel)
    .directive('fileDropzone', fileDropzone);

  fileModel.$inject = ['$parse'];
  function fileModel($parse) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        const model = $parse(attrs.fileModel);
        const modelSetter = model.assign;

        element.bind('change', function () {
          scope.$apply(function () {
            if (element[0].multiple) {
              modelSetter(scope, element[0].files);
            } else {
              modelSetter(scope, element[0].files[0]);
            }
          });
        });
      }
    };
  }

  function fileDropzone() {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element.bind('dragover', function (e) {
          e.preventDefault();
          element.addClass('dragover');
        });

        element.bind('dragleave', function (e) {
          e.preventDefault();
          element.removeClass('dragover');
        });

        element.bind('drop', function (e) {
          e.preventDefault();
          element.removeClass('dragover');
          const files = e.dataTransfer ? e.dataTransfer.files : e.originalEvent.dataTransfer.files;
          if (files && files.length > 0) {
            scope.$apply(function () {
              if (attrs.fileDropzone) {
                scope.$eval(attrs.fileDropzone, { $files: files });
              }
            });
          }
        });
      }
    };
  }
})();
