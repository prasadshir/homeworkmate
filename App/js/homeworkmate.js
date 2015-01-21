/**
 * Created by prasad.shirgaonkar on 1/15/15.
 */

//Wrap inside an anonymous jQuery function
//Define a Namespace for your App as window.MyApp, its just an object with models, collections, views & routers

(function(){

    window.HomeworkMateApp = {
        Models: {},
        Collections: {},
        Views: {},
        Router: {},
        currentUserPref: {}
    };
//Define your Drupal root path, all paths used in this app will be derived from this path.

    var drupalRoot = "http://drupal-8-0-0-beta4-headless.local:8083";

    /**
     * Function used for building a node object in hal+json format as required by Drupal for creating nodes
     */

    function buildNodeObject(std, subject, hwtype, givenon, dueon, desc ){

    var nodepost =    {
        "_links": {
            "type": {
                "href": drupalRoot + "/rest/type/node/homework"
            },
            "http://drupal-8-0-0-beta4-headless.local:8083/rest/relation/node/homework/field_standard_and_division": [
                {
                    "href": drupalRoot + "/taxonomy/term/" + std
                }
            ],
            "http://drupal-8-0-0-beta4-headless.local:8083/rest/relation/node/homework/field_subject": [
                {
                    "href": drupalRoot + "/taxonomy/term/" + subject
                }
            ],
            "http://drupal-8-0-0-beta4-headless.local:8083/rest/relation/node/homework/field_type": [
                {
                    "href": drupalRoot + "/taxonomy/term/" +hwtype
                }
            ]
        },

        "type": [
            {
                "target_id": "homework"
            }
        ],
        "langcode": [
            {
                "value": "en"
            }
        ],
        "title": [
            {
                "value": std + subject + givenon,
                "lang": "en"
            }
        ],
        "body": [
            {
                "value": desc,
                "format": "basic_html",
                "summary": "",
                "lang": "en"
            }
        ],
        "field_due_on": [
            {
                "value": dueon
            }
        ],
        "field_given_on": [
            {
                "value": givenon
            }
        ],

        "field_standard_and_division":[
            {
                "target_id": std
            }
        ],
        "field_subject":[
            {
                "target_id": subject
            }
        ],
        "field_type":[
            {
                "target_id": hwtype
            }],
    };

        return nodepost;

    }

    var headers = { Authorization: "Basic " + btoa("admin:admin"), Accept: "*/*", "Content-Type": "application/hal+json"};

    // Define Base Model
    HomeworkMateApp.Models.Homework = Backbone.Model.extend({
        idAttribute: 'nid',

        urlRoot: drupalRoot,
        url: function() {
            if (this.isNew()) return this.urlRoot + "/entity/node";
            return this.urlRoot + "/node" +this.id;
        },

                save: function(attributes, options) {
                    options || (options = {});
                    _.defaults(options, { headers: headers});
                    return Backbone.Model.prototype.save.call(this, attributes, options);
                }

    });

    // Define model for holding user preferences. Need to persist this using LocalStorage.

    HomeworkMateApp.Models.Preferences = Backbone.Model.extend({
        defaults: {
            role: 'parent', schoolClass: 7
        }
    });

    currentUserPref = new HomeworkMateApp.Models.Preferences();

    /**
     * @Collections used in the App
     */

    HomeworkMateApp.Collections.HomeworkCollection = Backbone.Collection.extend({
        model: HomeworkMateApp.Models.Homework,
        url: "http://drupal-8-0-0-beta4-headless.local:8083/today/rest"
    });

    //Define placeholder data for homework model. This is needed as the real data will be loaded in an async process
    var modelsdata = [{"nid":"0","body":"dummy","field_due_on":"dummy","field_given_on":"dummy","field_subject":"Loading","field_type":"Writing"}];

    //Create an instance of the collection to hold the actual data
    var homeworkCollection = new HomeworkMateApp.Collections.HomeworkCollection(modelsdata);

    // Fetch the data from Drupal site using fetch() method. This is an async call to the renote URL
    // So need to re-render the view on success() event.

    homeworkCollection.fetch().success(
        function(){
        homeworkListView.render();
    });

    /**
     *
     * @Views used in the App.
     */

//View for a single Homework record in a list
    HomeworkMateApp.Views.HomeworkListItemView = Backbone.View.extend({
        tagName: 'div',
        template: _.template($('#homework-list-item').html()),
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
    });

// View for detailed view of each record
    HomeworkMateApp.Views.HomeworkDisplayView = Backbone.View.extend({
        el: $('#homework .list-group'),
        tagName: 'div',
        template: _.template($('#homework-display').html()),
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
    });

//View for displaying list of all Homework assignments
    HomeworkMateApp.Views.HomeworkListView = Backbone.View.extend({

        el: $('#homework .list-group'),

        tagName: 'div',

        render: function() {
            var homeworkViewList = [];
            this.collection.each(function(homework) {
                var homeworkView = new HomeworkMateApp.Views.HomeworkListItemView({ model: homework });
                homeworkViewList.push(homeworkView.render().el)
            }, this);
            this.$el.html(homeworkViewList);

            return this;
        }
    });

// Create an instance of the List View and assign collection to it.
    var homeworkListView = new HomeworkMateApp.Views.HomeworkListView({ collection: homeworkCollection });


// View for displaying Preferences form
    HomeworkMateApp.Views.PreferencesFormView = Backbone.View.extend({
        el: $('#pref-form-display'),
        events: {
            "click #pref-form-btn": "savePref",
        },
        template: _.template($('#pref-form').html()),
        render: function() {
            this.$el.html(this.template());
            return this;
        },
        savePref: function() {
            console.log('here');
            this.model.set({
                role: $('#role').val(),
                schoolClass: $('#schoolClass').val(),
            });

            $("#pref-form-div .panel-body").prepend('<div class="alert alert-success"role="alert"> Settings Saved </div>');
            if($('#role').val()=="teacher"){$("#navbar .addNew").show();}
            if($('#role').val()=="parent"){$("#navbar .addNew").hide();}
        }

    });

    // View for displaying Add content form
    HomeworkMateApp.Views.AddNodeFormView = Backbone.View.extend({
        el: $('#pref-form-display'),
        events: {
            "click #add-form-btn": "saveNode",
        },
        template: _.template($('#add-form').html()),
        render: function() {
            this.$el.html(this.template());
            return this;
        },
        saveNode: function() {
            std = $("#std").val();
            subject = $("#subject").val();
            hwtype = $("#hwtype").val();
            givenon = $("#givenon").val();
            dueon = $("#dueon").val();
            desc = $("#desc").val();

            var nodepost = buildNodeObject(std,subject,hwtype,givenon,dueon,desc);

            var homeworkNode = new HomeworkMateApp.Models.Homework(nodepost);

            homeworkNode.save();

            $("#add-form-div .panel-body").prepend('<div class="alert alert-success"role="alert"> Homework Saved </div>');
        }

    });

    //Create instance of Preferences form
    var prefFormView = new HomeworkMateApp.Views.PreferencesFormView({model: currentUserPref });

    //Create an instance of Add Node form
    var addNodeFormView = new HomeworkMateApp.Views.AddNodeFormView();

    /**
     *
     * Routers used in the App
     */

    HomeworkMateApp.Router = Backbone.Router.extend({
        routes: {
            '': 'index',
            'show/:id': 'show',
            'pref': 'pref',
            'add': 'add'
        },

        index: function(){
            //render List View
            if(currentUserPref.get("role")=="parent"){$("#navbar .addNew").hide();}
            $("#homework").show();
            $("#pref-form-display").hide();
            homeworkListView.render();
        },

        show: function(id){
            //Render individual model display View by passing model Id to it from URL
            var homeworkModel = homeworkCollection.get(id);
            var homeworkDisplay = new  HomeworkMateApp.Views.HomeworkDisplayView({model:homeworkModel});
            homeworkDisplay.render();
        },

        pref: function(){
            //render Preferences form view
            $("#pref-form-display").show();
            $("#homework").hide();
            prefFormView.render();
        },

        add: function(){
            //render Node Add Form view
            $("#pref-form-display").show();
            $("#homework").hide();
            addNodeFormView.render();
        }
    });

    new HomeworkMateApp.Router;
    Backbone.history.start();

})();