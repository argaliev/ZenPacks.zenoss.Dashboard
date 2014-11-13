/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2014, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/
(function(){
    var router = Zenoss.remote.DashboardRouter;
    /**
     * @class Zenoss.dashboard.DashboardController
     * This class drives the page logic for adding, editing and deleting Dashboards
     * @extends Ext.app.Controller
     */
    Ext.define('Zenoss.Dashboard.controller.DashboardController', {
        models: ['Dashboard'],
        refs: [{
            selector: 'combo[itemId="currentDashboard"]',
            ref: "dashboardSelecter"
        }, {
            selector: 'dashboardpanel',
            ref: "dashboardPanel"
        }],
        views: [
            "PortalPanel",
            "DashboardPanel",
            "PortalDropZone",
            "DashboardContext"
        ],

        extend: 'Ext.app.Controller',
        init: function() {

            this.control({
                'menuitem[itemId="newPortlet"]': {
                    click: this.showAddPortletDialog
                },
                'menuitem[itemId="newDashboard"]': {
                    click: this.showNewDashboardDialog
                },
                'button[itemId="deleteDashboard"]': {
                    click: this.deleteSelectedDashboard
                },
                'button[itemId="editDashboard"]': {
                    click: this.editSelectedDashboard
                },
                'portlet': {
                    close: this.saveDashboardState,
                    resize: this.saveDashboardState
                },
                'portlet tool[itemId="editPortlet"]': {
                    click: this.showEditPortletDialog
                },
                'combo[itemId="currentDashboard"]': {
                    select: this.renderCurrentDashboard
                },
                'portalpanel': {
                    drop:  this.saveDashboardState
                }
            });
        },
        showEditPortletDialog: function(tool){
            var portlet = tool.up('portlet');
            var win = Ext.create('Zenoss.Dashboard.view.EditPortletDialog', {
                portlet: portlet
            });

            // save handler for the dialog
            win.query('button[ref="submitButton"]')[0].on('click', function() {
                var updatedConfig = win.getFormValues();
                portlet.applyConfig(updatedConfig);
                this.saveDashboardState();
                win.close();
            }, this, {single: true});
            win.show();
        },
        showAddPortletDialog: function(){
            var win = Ext.create('Zenoss.Dashboard.view.AddPortletDialog', {
            });

            // save handler for the dialog
            win.query('button')[0].on('click', function() {
                var portlet = win.getPortlet();
                // since the portlet will be destroyed
                // when the window is closed we need to save its properties
                // and readd it
                this.addPortlet(this.extractPortlet(portlet));
                this.saveDashboardState();
                win.close();
            }, this, {single: true});
            win.show();
        },
        showNewDashboardDialog: function() {
            var win = Ext.create('Zenoss.Dashboard.view.AddDashboardDialog', {
            });

            // save handler for the dialog
            win.on('newdashboard', function(params) {
                router.addDashboard(params, function(response) {

                    // make sure we successfully create the dashboard before closing the dialog
                    if (response.success) {
                        win.close();
                        this.reloadDashboards(params.newId);
                    }
                }, this);
            }, this);

            win.show();
        },
        editSelectedDashboard: function() {
            var dashboard = this.getCurrentDashboard();
            var win = Ext.create('Zenoss.Dashboard.view.EditDashboardDialog', {
                dashboard: dashboard
            });
            win.on('savedashboard', function(params){
                router.saveDashboard(params, function(response){
                    if (response.success) {
                        win.close();
                        this.reloadDashboards(response.data.id);
                    }
                }, this);
            }, this);
            win.show();
        },
        getCurrentDashboard: function() {
            // look at what is selected
            var combo = this.getDashboardSelecter(), store = combo.getStore(),
                record = store.findRecord('uid', combo.getValue());
            return record;
        },
        /**
         * Reloads the dashboard drop down and if an id is passed in selects it
         **/
        reloadDashboards: function(id) {
            this.getDashboardSelecter().getStore().load({
                callback: function() {
                    if (id) {
                        var combo = this.getDashboardSelecter(),
                        record = combo.getStore().findRecord('id', id);
                        if (record) {
                            combo.setValue(record.get('uid'));
                            this.renderCurrentDashboard();
                        }
                    }
                },
                scope: this
            });
        },
        deleteSelectedDashboard: function() {
            var dashboard = this.getCurrentDashboard(), me = this;
            // make sure we always have the default dashboard
            if (dashboard.get('uid') == "/zport/dmd/ZenUsers/dashboards/default") {
                new Zenoss.dialog.SimpleMessageDialog({
                    message: _t("You can not delete the default Dashboard"),
                    title: _t('Delete Dashboard'),
                    buttons: [{
                        xtype: 'DialogButton',
                        text: _t('Cancel')
                    }]
                }).show();
                return;
            }

            // prompt them to delete the dashboard
            new Zenoss.dialog.SimpleMessageDialog({
                message: Ext.String.format(_t("Are you sure you want to delete the dashboard: {0} ?"), dashboard.get('id')),
                title: _t('Delete Dashboard'),
                buttons: [{
                    xtype: 'DialogButton',
                    text: _t('OK'),
                    handler: function() {
                        Zenoss.remote.DashboardRouter.deleteDashboard({
                            uid: dashboard.get('uid')
                        }, function(){
                            me.reloadDashboards();
                            var combo = me.getDashboardSelecter();
                            // select the first dashboard
                            var dashboard = combo.getStore().getAt(0);
                            combo.setValue(dashboard.get('uid'));
                            me.renderCurrentDashboard();
                        });
                    }
                }, {
                    xtype: 'DialogButton',
                    text: _t('Cancel')
                }]
            }).show();

        },
        /**
         * Persists the dashboard state to the server
         **/
        saveDashboardState: function() {
            var dashboard = this.getCurrentDashboard(),
                state = this.getCurrentDashboardState();
            dashboard.set('state', state);
            if (!this.saveTask) {
                this.saveTask = new Ext.util.DelayedTask(Ext.bind(this._updateDashboardServerState, this));
            }
            this.saveTask.delay(250);
        },
        _updateDashboardServerState: function() {
            var dashboard = this.getCurrentDashboard(),
                state = this.getCurrentDashboardState();
            state = this.getCurrentDashboardState();
            Zenoss.remote.DashboardRouter.saveDashboardState({
                uid: dashboard.get('uid'),
                state: state
            });
        },
        extractPortlet: function(portlet) {
            var portletProperties = {
                title: portlet.getTitle(),
                config: portlet.getConfig(),
                xtype: portlet.getXType(),
                height: portlet.getHeight() || 100
            }
            return portletProperties;
        },
        addPortlet: function(portletConfig) {
            // TODO: find the column that is the smallest
            // add the portlet to it
            var columns = this.getDashboardPanel().query('portalcolumn');
            columns[0].add(portletConfig);
        },
        /**
         * returns a JSON encoded string that is the dashboards "layout".
         * This is saved on the Dashboard object on the server so that when the
         * page is revisited the layout can be reconstituted
         **/
        getCurrentDashboardState: function() {
            var panel = this.getDashboardPanel(),
                state = [], i, j, portlets, portlet, items=[],
                columns = panel.query('portalcolumn');
            for (i=0; i< columns.length; i++) {
                column = columns[i];
                portlets = column.query('portlet');
                for (j=0; j < portlets.length; j++) {
                    portlet = portlets[j];
                    items.push(this.extractPortlet(portlet));
                }
                state.push({
                    id: 'col-' + i.toString(),
                    items: items
                });
                items = [];
            }
            return Ext.JSON.encode(state);
        },
        /**
         * Draws the dashboard based on the saved state of the selected Dashboard.
         *
         **/
        renderCurrentDashboard: function() {
            var dashboard = this.getCurrentDashboard(),
                panel = this.getDashboardPanel(), i,
                state = dashboard.get('state'), columns=[];
            if (state) {
                columns = Ext.JSON.decode(state);
                if (columns.length != dashboard.get('columns')) {
                    columns = this.movePortletsToColumns(columns, dashboard.get('columns'));
                    this.saveDashboardState();
                }
            } else {
                // if there is no state (it is a new dashboard or an empty one)
                // just add placeholders for the columns
                for (i=0; i<dashboard.get('columns'); i++) {
                    columns.push({
                        id: 'col-' + i.toString(),
                        items: []
                    })
                }
            }

            Ext.suspendLayouts();
            panel.removeAll();
            panel.add(columns);
            Ext.resumeLayouts(true);
        },
        /**
         * This happens when the saved state of the portlet config
         * differs from the saved number of columns for a dashboard
         **/
        movePortletsToColumns: function(columns, columnLength) {
            var portlets = [], i, newColumns=[];
            Ext.each(columns, function(col){
                portlets = portlets.concat(col.items)
            });
            for (i=0; i<columnLength; i++) {
                newColumns.push({
                    id: 'col-' + i.toString(),
                    items: []
                })
            }
            i=0;
            Ext.each(portlets, function(portlet){
                newColumns[i].items.push(portlet);
                i++;
                if (i == columnLength) {
                    i=0;
                }
            });
            return newColumns;
        }
    });
})();
