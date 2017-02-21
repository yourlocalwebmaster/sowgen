var app = angular.module('app', ['ngAnimate', 'textAngular', 'ngMaterial', 'ngRoute'])
    .config(function($rootScope){
        $rootScope.skipAuthentication = true; // This will break the app, but allow you to access the UI for display purposes.
    })
    .run(function($rootScope, $location, $http, TokenFactory){
        $rootScope.$on('$viewContentLoaded', function(event, viewConfig)
        {

            if (TokenFactory.GetAccessToken() == null && !$rootScope.skipAuthentication) {
                $location.path('/authenticate');
            }

        });

    })
    .config(function ($routeProvider, $locationProvider) {
        var version = 1;
        $routeProvider
            .when('/', {
                templateUrl: 'views/templateSelector.html?v='+version,
                controller: 'HomeController',
            })
            .when('/authenticate',{
                templateUrl: 'views/authenticate.html?v='+version,
                controller: 'AuthController'
            })
            .when('/project', {
                templateUrl: 'views/project.html?v='+version,
                controller: 'ProjectController'
            })
            .when('/editor', {
                templateUrl: 'views/editor.html?v='+version,
                controller: 'EditorController'
            })
            .when('/success',{
                templateUrl: 'views/success.html?v='+version,
                controller: 'SuccessController'
            });
    })
    .factory('ProjectService', function ($q, $http) {
        var project = {};
        return {
            SetProject: function (prj) {
                console.log('setting project to... ')
                console.log(prj);
                project = prj;
            },
            GetProject: function () {
              return project;
            },
            GetProjectAttribute: function (att) {
                return project[att];
            },
            SetProjectAttribute: function (att, v) {
                project[att] = v;
            }
        }
    })
    .factory('TokenFactory', function($q,$http,$httpParamSerializerJQLike){
       var access_token = null;

        return {

            GetAccessToken: function(){
                return access_token;
            },
            SetAccessToken: function(token){
                access_token = token;
            },
            Authenticate: function(username,password){
                // if this fails to authenticate, you will need to generate a new one in the laravel install with `php artisan passport:client --password`  and update the client ID and the client_secret here.
                var grant_type = 'password';
                var client_secret ='WT81jCLUa57pYWvF3lelFT7d3ndMuX3qi6BQhoAe';
                var client_id = 1;
                var scope = '';
                var data = {
                    grant_type : grant_type,
                    client_secret: client_secret,
                    client_id: client_id,
                    scope : scope,
                    username: username,
                    password: password
                };
                return $http({
                    method:'POST',
                    url: 'http://intranetlaravel.dev/oauth/token',
                    headers: {
                        'Content-Type':'application/x-www-form-urlencoded'
                    },
                    data: $httpParamSerializerJQLike(data)
                });
            }
        }

    })
    .factory('TemplateFactory', function ($q, $http,TokenFactory,ProjectService) {

        var version = 2;
        var actionSection = 0;
        var actionSubSection = 0;
        var preexisting_loaded = false;
        var template;
        return {

            Templates: function () {
                return $http.get('templates/templates.json?v='+version);
            },
            SowContainer: function () {
                return $http.get('templates/' + template.file +'?v='+version); //used for init..
            },
            // Create Blank/Boilerplate
            Section: function () {
                return $http.get('templates/sections/blank.json?v='+version);
            },
            // Create a Blank/Boilerplate
            SubSection: function () {
                return $http.get('templates/subsections/blank.json?v='+version);
            },

            LoadTemplateJson: function (path) {
                return $http.get('templates/' + path +'?v='+version);
            },

            GetSavedTemplates: function(){
                return $http({
                    method: 'GET',
                    url: 'http://intranetlaravel.dev/sow',
                    headers: {
                        Authorization: 'Bearer ' + TokenFactory.GetAccessToken().access_token,
                        Accepts: 'application/json'
                    }
                });
            },
            GetTemplate: function(){
                return template;
            },
            ProcessSavedMerge: function(saved_template){

                console.log('running process saved merge');
                var new_template = angular.fromJson(saved_template.template);

                //todo: delete the new_template.templates node... this is obsolete if they are importing..

                new_template.templates = []; //overwrite with empty array.
                new_template.master_id = saved_template.id; // because they are selecting a preexisting template, reference to the existing id is importrant.
                new_template.revision_id = saved_template.revision_id;
                new_template.public = saved_template.public;
                new_template.revision_id = saved_template.revision_id;
                template = new_template;
                preexisting_loaded = true;
                ProjectService.SetProject(template.project);
                console.log(template);
            },
            PreExistingLoaded: function(){
                return preexisting_loaded;
            },
            GetActiveSection: function () {
                return this.actionSection;
            },
            SetActiveSection: function (index) {
                this.actionSection = index;
            },
            GetActiveSubSection: function () {
                return this.actionSubSection;
            },
            SetActiveSubSection: function (index) {
                this.actionSubSection = index;
            },
            SetDefaultTemplate: function (chosentemplate) {
                if (!angular.isUndefined(chosentemplate)) {
                    template = chosentemplate;
                }
                console.log('bootstrapping template' + template.file +'?v='+version);
            }
        }
    })
    .controller('HomeController', function ($scope,$rootScope) {
       $scope.pageClass = "home";
    })
    .controller('EditorController', function ($scope) {
        $scope.pageClass = "editor";
    })
    .controller('SuccessController', function($scope,$routeParams){
        $scope.pdf = $routeParams.pdf;
    })
    .controller('SavedTemplateController', function($scope, $routeParams, TemplateFactory){
            $scope.template = {};
            TemplateFactory.GetSavedTemplates().then(function (response) {
                $scope.savedTemplates = response.data;
                console.log(response.data);
            });

        /**
         * gets the key of the template form savedAvailableTemplates and sends the json back to factory for processing insertion.
         * @param key
         */
        $scope.openSavedTemplate = function(template){
                TemplateFactory.ProcessSavedMerge(template);
            }
    })
    .controller('ProjectController', function ($scope, ProjectService) {
        $scope.pageClass = "project";
        $scope.projectInit = function () {
            console.log('running project init.');
            $scope.project = ProjectService.GetProject();
        }

    })
    // login controller.
    .controller('AuthController', function($scope,TokenFactory, $location,$document){
        $scope.error  = '';

        $scope.login = function(){
            var username = angular.element(document.getElementById('username')).val();
            var password = angular.element(document.getElementById('password')).val();
            TokenFactory.Authenticate(username,password).then(function(response){
                TokenFactory.SetAccessToken(response.data);
                $location.path('/');
            },function(response){
                angular.element($document.find('label')).addClass('error');
                $scope.error = response.data.message
            });
        }

    })
    .controller('AppController', function ($scope, TemplateFactory, $sce, $document, $compile, $mdDialog, $location, $routeParams, ProjectService, $http,$rootScope, TokenFactory, $httpParamSerializerJQLike, $window) {

        $scope.appInit = function () {
            console.log('running APP init');
            // Load a map of available templates, sections, and subsections. These are hard coded in templates.json.
            TemplateFactory.Templates().then(function (response) {
                console.log(response.data);
                $scope.availableTemplates = response.data;
            });
        }
        $scope.log = function (data) {
            console.log(data);
        }
        $scope.trust = function (html) {
            return $sce.trustAsHtml(html);
        }
        $scope.sayHello = function (name) {
            console.log('hello ' + name);
        }
        $scope.resizePane = function (opened) {
            if (!opened) {
                angular.element(document.getElementById('leftPane')).removeClass('col-md-8');
                angular.element(document.getElementById('rightPane')).removeClass('col-md-4');
                angular.element(document.getElementById('leftPane')).addClass('col-md-12');
                angular.element(document.getElementById('rightPane')).addClass('floattopright');
            } else {
                angular.element(document.getElementById('leftPane')).removeClass('col-md-12');
                angular.element(document.getElementById('rightPane')).removeClass('floattopright');
                angular.element(document.getElementById('leftPane')).addClass('col-md-8');
                angular.element(document.getElementById('rightPane')).addClass('col-md-4');
            }
        }
        $scope.setCurrentSection = function ($event, index) {
            console.log('running set current section.');
            // clear existing current....
            $scope.clearSelectedSection();
            $scope.clearSelectedSubSection();
            //set new current.
            angular.element($event.currentTarget).addClass('current');
            TemplateFactory.SetActiveSection(index);

            //console.log($scope.activeSection + ' |  ' + index);
            console.log($scope.sowContainer);
        }

        $scope.setCurrentSubSection = function ($event, section_index, subsection_index) {
            console.log('running set current SUB section.');
            $scope.clearSelectedSubSection();
            $scope.clearSelectedSection();
            angular.element($event.currentTarget).addClass('currentsub');
            TemplateFactory.SetActiveSection(section_index);
            TemplateFactory.SetActiveSubSection(subsection_index);

            //stop propagation from running set section
            $event.stopPropagation();
        }

        $scope.clearSelectedSection = function () {
            $document.find('li').removeClass('current');
        }
        $scope.clearSelectedSubSection = function () {
            $document.find('li').removeClass('currentsub');
        }

        $scope.deleteSection = function () {

            if (TemplateFactory.GetActiveSection() == null && TemplateFactory.GetActiveSubSection() == null) {
                console.log('did not delete anything because nothing was selected and something was recently deleted....');
                return false;
            }

            var currentkey = angular.element(document.getElementsByClassName('current')).attr('data-key');
            var currentsub_key = angular.element(document.getElementsByClassName('currentsub')).attr('data-key');
            var currentsub_subkey = angular.element(document.getElementsByClassName('currentsub')).attr('data-subkey');

            // is a subsection
            if (currentsub_subkey) {
                $scope.sowContainer.sections[currentsub_key].subsections.splice(currentsub_subkey, 1);
            } else { // is not subsection.

                // do it twice...
//            if(currentkey == TemplateFactory.GetActiveSection()){
//                console.log('yes, it equals.');
//                $scope.sowContainer.sections.splice(currentkey,1);
//            }

                angular.element(document.querySelector('[data-key="' + currentkey + '"]')).remove();
                $scope.sowContainer.sections.splice(currentkey, 1);
            }

            // reset the active section / subsection!
            TemplateFactory.SetActiveSection(null);
            TemplateFactory.SetActiveSubSection(null);

        }


        // })
        // .controller('IndexController', function($scope,TemplateFactory){
        $scope.setTemplate = function (template) {
            console.log('setting template: ' + template.name);
            TemplateFactory.SetDefaultTemplate(template);
        }
        // })
        // .controller('ActionController', function($scope, TemplateFactory, $mdDialog){

        var alert;

        // Internal method
        $scope.showAlert = function () {
            alert = $mdDialog.alert({
                title: 'Attention',
                textContent: 'Content',
                ok: 'Close'
            });

            $mdDialog
                .show(alert)
                .finally(function () {
                    alert = undefined;
                });
        }

        $scope.showTemplateLoader = function ($event) {

            var parentEl = angular.element(document.body);
            console.log('logging templates');
            console.log($scope.availableTemplates);
            $mdDialog.show({
                parent: parentEl,
                targetEvent: $event,
                template: '<md-dialog aria-label="List dialog">' +
                '  <md-dialog-content>' +
                    '<h3>Sections</h3>' +
                '    <select id="templateSectionSelector">' +
                '      <optgroup label="Sections">' +
                        '<option ng-repeat="(key,template) in templates.sections" value="sections/{{template.file}}">' +
                '       {{template.name}}' +
                '      ' +
                '    </option>' +
                '</optgroup>' +
                '      <optgroup label="Subsections">' +
                '<option ng-repeat="(key,template) in templates.subsections" value="subsections/{{template.file}}">' +
                '       {{template.name}}' +
                '      ' +
                '    </option>' +
                '</optgroup>' +
                '</select>' +
                '  </md-dialog-content>' +
                '  <md-dialog-actions>' +
                '    <md-button ng-click="closeDialog()" class="md-primary">' +
                '      Close Dialog' +
                '    </md-button>' +
                '<md-button class="btn-primary btn" ng-click="loadTemplateAndCloseDialog()">' +
                'Load Template' +
                '</md-button>' +
                '  </md-dialog-actions>' +
                '</md-dialog>',
                locals: {
                    templates: $scope.availableTemplates,
                    newSection: $scope.newSection,
                    newSubSection: $scope.newSubSection
                },
                controller: $scope.LoadDialogController
            });
        }
        $scope.LoadDialogController = function ($scope, $mdDialog, templates, newSection, newSubSection) {

            $scope.templates = templates;

            $scope.closeDialog = function () {
                $mdDialog.hide();
            }
            $scope.loadTemplateAndCloseDialog = function(){
                console.log('Loading template and closing dialog.');
                var desiredTemplate = angular.element(document.getElementById('templateSectionSelector'));
                TemplateFactory.LoadTemplateJson(desiredTemplate.val()).then(function(response){
                    if(response.data.type == "subsection"){
                        console.log('loading subsection into template.');
                        newSubSection(response.data);
                    }else
                    {
                        newSection(response.data);
                    }
                });
                $scope.closeDialog();
            }
        }

        $scope.showSaveOptions = function ($event) {
            var parentEl = angular.element(document.body);
            $mdDialog.show({
                parent: parentEl,
                targetEvent: $event,
                template: '<md-dialog aria-label="List dialog">' +
                            '<md-dialog-content>' +
                                '<h3>Generate A PDF?</h3>' +
                            '</md-dialog-content>' +
                            '<md-dialog-actions>' +
                            '<md-button ng-click="saveSow(true)" class="btn btn-primary">Yes</md-button>' +
                            '<md-button ng-click="saveSow(false)" class="btn btn-danger">No</md-button>' +
                            '</md-dialog-actions>' +
                        '</md-dialog>',
                locals: {
                    postToPdfMaker: $scope.postToPdfMaker
                },
                controller: $scope.SaveDialogController
            });
        }

        $scope.SaveDialogController = function($scope,$mdDialog,postToPdfMaker){
            $scope.closeDialog = function () {
                $mdDialog.hide();
            }

            $scope.saveSow = function(generatePDF){
                postToPdfMaker(generatePDF);
                $scope.closeDialog();
            }
        }

        $scope.newSection = function (section) {


            $scope.clearSelectedSubSection();
            $scope.clearSelectedSection();
            var position = TemplateFactory.GetActiveSection() + 1;

            if(!angular.isUndefined(section)){
                $scope.sowContainer.sections.splice(position, 0, section);
                TemplateFactory.SetActiveSection(position);
            }
            else {
                TemplateFactory.Section().then(function (response) {
                    $scope.sowContainer.sections.splice(position, 0, response.data);
                    // if add section is clicked, the active section should be the lastest index...
                    TemplateFactory.SetActiveSection($scope.sowContainer.sections.length - 1);
                    //console.log($scope.activeSection);
                });
            }

        }
        $scope.newSubSection = function (subsection) {

            var position = TemplateFactory.GetActiveSubSection() + 1;

            if(!angular.isUndefined(subsection)){
                console.log('Adding subsection from template.');
                $scope.sowContainer.sections[TemplateFactory.GetActiveSection()].subsections.splice(position, 0, subsection);
            }else {
                console.log('Adding blank subsection.');
                TemplateFactory.SubSection().then(function (response) {
                    $scope.sowContainer.sections[TemplateFactory.GetActiveSection()].subsections.splice(position, 0, response.data);
                });
            }
        }
        $scope.toggleMenu = function (open) {

            angular.element($document.find()).addClass(classname);

        }
        // })
        // .controller('TemplateController', function($scope,$compile,TemplateFactory){

        $scope.templateInit = function () {
            console.log("running Template init()");
            //TemplateFactory.GetDefaultTemplate($scope.template);
            //load selected template (see TemplateFactory server for selected template.)


            // if the user loaded a preeixisnt template, do not load as SOW container.
            if(TemplateFactory.PreExistingLoaded()) {
                console.log('user is loading an API template, skip template local load');
                $scope.sowContainer = TemplateFactory.GetTemplate();
            }
            else{
                console.log('user is trying to load a local template.');
                TemplateFactory.SowContainer().then(function (response) {
                    console.log(response.data);
                    $scope.sowContainer = response.data;

                    $scope.sowContainer.project = ProjectService.GetProject();

                    angular.forEach(response.data.templates, function (val, key) {
                        TemplateFactory.LoadTemplateJson(val).then(function (response) {
                            console.log('adding ' + response.data.section);
                            $scope.sowContainer.sections.push(response.data);
                            TemplateFactory.SetActiveSection(key);
                        });
                    });
                });
            }
        }
        $scope.editSection = function ($event, key, subkey) {
            var el = angular.element($event.currentTarget);

            var dasTitleModel;
            var dasBodyModel;
            if (subkey != null) {
                dasTitleModel = 'sowContainer.sections[' + key + '].subsections[' + subkey + '].title';
                dasBodyModel = 'sowContainer.sections[' + key + '].subsections[' + subkey + '].content';
            } else {
                dasBodyModel = 'sowContainer.sections[' + key + '].content';
                dasTitleModel = 'sowContainer.sections[' + key + '].title';
            }
            var temp = "<div id='editContainer'>" +
                "<div class='row' id='editTitleContainer'>" +
                "<div class='form-group col-md-12'>" +
                "<label>TITLE</label> <input type='text' name='editTitle' class='form-control'  ng-model='" + dasTitleModel + "' />" +
                "</div>" +
                "</div>" +
                "<div class='row' id='editBodyContainer' >" +
                "<div class='form-group col-md-12'>" +
                "<text-angular  ng-model='" + dasBodyModel + "' ta-toolbar='[[\"html\"],[\"h1\",\"h2\",\"h3\",\"p\"],[\"ul\",\"ol\"],[\"bold\",\"italics\",\"underline\"],[\"insertLink\"]]'></text-angular>" +
                "</div>" +
                "</div>" +
                "</div>";
            // need to recompile template so that the element has access to $scope
            angular.element(document.getElementById('editContainer')).replaceWith($compile(temp)($scope));
        }

        $scope.postToPdfMaker = function(generatePDF){

             var data = $scope.sowContainer;
             var cfg = {
                 url: 'http://intranetlaravel.dev/sow',
                 method: 'POST',

                 //data: $httpParamSerializerJQLike(data),
                 data: {'generatePDF': generatePDF,'sow':data},
                 headers: {
                    'Accept' : 'application/json',
                    "Authorization" : "Bearer " + TokenFactory.GetAccessToken().access_token
                 }
             };
            $http(cfg).then(function(response){
                // TODO send to a page where they can view their PDF..
                if(generatePDF){

                    $scope.saveAlert = 'Saved! Your PDF was generated here: ' + response.data.pdf_url;
                    $window.open(response.data.pdf_url);
                   

                }

                $location.url('/');

            });
        }

    });

