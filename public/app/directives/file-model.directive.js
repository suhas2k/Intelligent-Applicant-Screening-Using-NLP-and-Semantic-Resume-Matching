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
        let dragCounter = 0;

        element.bind('dragenter', function (e) {
          e.preventDefault();
          e.stopPropagation();
          dragCounter++;
          element.addClass('is-dragging');
        });

        element.bind('dragover', function (e) {
          e.preventDefault();
          e.stopPropagation();
          element.addClass('is-dragging');
        });

        element.bind('dragleave', function (e) {
          e.preventDefault();
          e.stopPropagation();
          dragCounter--;
          if (dragCounter <= 0) {
            dragCounter = 0;
            element.removeClass('is-dragging');
          }
        });

        element.bind('drop', function (e) {
          e.preventDefault();
          e.stopPropagation();
          dragCounter = 0;
          element.removeClass('is-dragging');

          const dt = e.dataTransfer || (e.originalEvent && e.originalEvent.dataTransfer);
          const files = dt ? dt.files : null;
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
