/**
 * Controller in add new artifact modal page
 */
(function() {
    'use strict';

    angular.module('theHiveControllers').controller('ObservableCreationCtrl',
        function($scope, $stateParams, $uibModalInstance, clipboard, CaseArtifactSrv, ListSrv, NotificationSrv, TagSrv, params, tags) {

            $scope.activeTlp = 'active';
            $scope.pendingAsync = false;
            $scope.step = 'form';
            $scope.params = params || {
                ioc: false,
                sighted: false,
                single: false,
                isZip: false,
                zipPassword: '',
                data: '',
                tlp: 2,
                message: '',
                tags: [],
                tagNames: ''
            };
            $scope.tags = tags || [];

            $scope.$watchCollection('tags', function(value) {
                $scope.params.tagNames = _.pluck(value, 'text').join(',');
            });

            $scope.getDataTypeList = function() {
                ListSrv.query({
                    listId: 'list_artifactDataType'
                }, function(data) {
                    $scope.types = _.filter(_.values(data), _.isString).sort();
                }, function(response) {
                    NotificationSrv.error('ObservableCreationCtrl', response.data, response.status);
                });
            };
            $scope.getDataTypeList();
            $scope.updateTlp = function(tlp) {
                $scope.params.tlp = tlp;
            };

            $scope.selectDataType = function(type) {
                $scope.params.dataType = type;
            };

            $scope.countObservables = function() {
                if (!$scope.params.data) {
                    return 0;
                }

                var arr = $scope.params.data.split('\n');

                if (arr.length === 0) {
                    return 0;
                }

                return _.without(_.uniq(_.map(arr, function(data) {
                    return data.trim();
                })), '', null, undefined).length;
            };

            $scope.add = function(form) {
                if (!form.$valid) {
                    return;
                }

                var params = $scope.params,
                    count = 1,
                    postData = {
                        dataType: params.dataType,
                        ioc: params.ioc,
                        sighted: params.sighted,
                        tlp: params.tlp,
                        message: params.message,
                        tags: _.unique(_.pluck($scope.tags, 'text'))
                    };

                var isFile = params.dataType === 'file';

                if (!isFile) {
                    if(params.single === true) {
                        postData.data = params.data;
                    } else {
                        postData.data = params.data.split('\n');
                        count = postData.length;
                    }
                } else {
                    postData.attachment = params.attachment;

                    if(params.isZip) {
                        postData.isZip = params.isZip;
                        postData.zipPassword = params.zipPassword;
                    }
                }

                $scope.pendingAsync = true;
                CaseArtifactSrv.api().save({
                    caseId: $stateParams.caseId
                }, postData, $scope.handleSaveSuccess, $scope.handleSaveFailure);
            };

            $scope.getFailedObservables = function(failures) {
                if(!_.isArray(failures)) {
                    failures = [failures];
                }

                return _.map(failures, function(observable) {
                    return {
                        data: observable.object.dataType === 'file' ? observable.object.attachment.name : observable.object.data,
                        type: observable.type
                    };
                });
            };

            $scope.handleSaveSuccess = function(response) {
                var success = 0,
                    failure = 0;

                if (response.status === 207) {
                    success = response.data.success.length;
                    failure = response.data.failure.length;

                    $scope.failedObservables = $scope.getFailedObservables(response.data.failure);

                    $scope.step = 'error';
                    $scope.pendingAsync = false;

                    NotificationSrv.log('Observables have been successfully created', 'success');

                } else {
                    success = angular.isObject(response.data) ? 1 : response.data.length;

                    NotificationSrv.log('Observables have been successfully created', 'success');

                    $uibModalInstance.close(response);
                }
            };

            $scope.handleSaveFailure = function(response) {
                $scope.pendingAsync = false;

                if (response.status === 400 && response.data.type === 'ConflictError') {
                    $scope.failedObservables = $scope.getFailedObservables(response.data);

                    $scope.step = 'error';
                } else {
										if(response.data.type) {
                        NotificationSrv.error('ObservableCreationCtrl', response.data.message, response.status);
                    } else {
                        NotificationSrv.error('ObservableCreationCtrl', 'An unexpected error occurred while creating the observables', response.status);
                    }

                    //$uibModalInstance.close(response);
                }

            };

            $scope.copyToClipboard = function() {
                var copied = _.pluck($scope.failedObservables, 'data');

                clipboard.copyText(copied.join('\n'));
            };

            $scope.cancel = function() {
                $uibModalInstance.dismiss('cancel');
            };

            $scope.isFile = function() {
                if ($scope.params.dataType) {
                    return $scope.params.dataType.endsWith('file');
                } else {
                    return false;
                }
            };

            $scope.getTags = function(query) {
                return TagSrv.fromObservables(query);
            };
        }
    );

})();
