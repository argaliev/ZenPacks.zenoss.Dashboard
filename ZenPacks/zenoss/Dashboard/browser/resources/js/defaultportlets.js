/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2014, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/
(function() {
    /**
     * @class Zenoss.Dashboard.view.Portlet
     * @extends Ext.panel.Panel
     * A {@link Ext.panel.Panel Panel} class that is managed by {@link Zenoss.dashboard.view.DashboardPanel}.
     * This is the base class for all portlets.
     */
    Ext.define('Zenoss.Dashboard.view.Portlet', {
        extend: 'Ext.panel.Panel',
        alias: 'widget.portlet',
        layout: 'fit',
        anchor: '100%',
        frame: true,
        resizable:true,
        closable: true,
        collapsible: true,
        animCollapse: true,
        height: 200,
        draggable: {
            moveOnDrag: false
        },
        cls: 'x-portlet',
        tools: [{
            xtype: 'tool',
            type: 'gear'
        }],
        // Override Panel's default doClose to provide a custom fade out effect
        // when a portlet is removed from the portal
        doClose: function() {
            if (!this.closing) {
                this.closing = true;
                this.el.animate({
                    opacity: 0,
                    callback: function(){
                        this.fireEvent('close', this);
                        this[this.closeAction]();
                    },
                    scope: this
                });
            }
        },
        getTitle: function() {
            return this.title;
        },
        constructor: function(config) {
            this.applyConfig(config.config || {});
            this.callParent([config]);
        },
        /**
         * Template method that is called when we are
         * fetching the configuration for this portlet.
         * Anything that can be set by the configuration display should
         * be returned here;
         **/
        getConfig: function() {
            return null;
        },
        getConfigFields: function() {
            var fields = [{
                xtype: 'textfield',
                fieldLabel: _t('Title'),
                name: 'title',
                value: this.getTitle(),
                allowBlank: false
            },{
                xtype: 'numberfield',
                name: 'height',
                fieldLabel: _t('Height'),
                value: this.getEl() ? this.getHeight() : this.height
            }];

            return fields.concat(this.getCustomConfigFields());
        },
        /**
         * Template method that is called when displaying the configuration fields
         * for this portlet.
         * It is expected that the subclasses will return an array of objects
         **/
        getCustomConfigFields: function() {
            return [];
        },
        applyConfig: function(config) {
            if (config.height && config.height != this.height) {
                this.height = config.height;
                if (this.getEl()) {
                    this.setHeight(config.height);
                }
            }
            if (config.title) {
                this.setTitle(config.title);
            }
            // by default apply all the config properties to this object
            Ext.apply(this, config);
        }
    });


    /**
     * A simple portlet that lets users define custom HTML to be displayed
     * on the application dashboard. This will execute any javascript that is
     * written.
     **/
    Ext.define('Zenoss.Dashboard.portlets.HTMLPortlet', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.htmlportlet',
        height: 100,
        content: "<h1>Blank HTMLPortlet</h1>",
        initComponent: function(){

            Ext.apply(this, {
                html: this.content
            });

            this.callParent(arguments);
        },
        getConfig: function() {
            return {
                html: this.content
            }
        },
        applyConfig: function(config) {
            if (config.html && config.html != this.content) {
                this.content = config.html;
                this.update(config.html, true);
            }
            this.callParent([config]);
        },
        getCustomConfigFields: function() {
            var fields = [{
                xtype: 'textarea',
                fieldLabel: _t('Content'),
                name: 'html',
                value: this.content,
                allowBlank: false,
                height: 100,
                width: 200
            }];
            return fields;
        }
    });


    /**
     * @class Zenoss.Dashboard.stores.Organizer
     * @extend Zenoss.DirectStore
     * Direct store for loading organizers
     */
    Ext.define("Zenoss.Dashboard.stores.Organizer", {
        extend: "Zenoss.NonPaginatedStore",
        constructor: function(config) {
            config = config || {};
            Ext.applyIf(config, {
                model: 'Zenoss.model.Basic',
                initialSortColumn: "name",
                directFn: Zenoss.remote.DashboardRouter.getSubOrganizers,
                root: 'data'
            });
            this.callParent(arguments);
        }
    });

    /**
     * Portlet that displays the map for locations
     *
     **/
    Ext.define('Zenoss.Dashboard.portlets.GoogleMaps', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.googlemapportlet',
        height: 400,
        pollingrate: 400,
        baselocation: "/zport/dmd/Locations",
        initComponent: function(){

            Ext.apply(this, {
                items: [{
                    xtype: 'iframe',
                    ref: 'mapIframe',
                    src: this.getIFrameSource()
                }]
            });

            this.callParent(arguments);
        },
        getIFrameSource: function() {
            return Ext.String.format('{0}/simpleLocationGeoMap?polling={1}', this.baselocation, this.pollingrate)
        },
        getConfig: function() {
            return {
                baselocation: this.baselocation,
                pollingrate: this.pollingrate
            }
        },
        applyConfig: function(config) {
            this.callParent([config]);
            if (this.rendered){
                this.down('iframe').load(this.getIFrameSource())
            }
        },
        getCustomConfigFields: function() {
            var store = Ext.create('Zenoss.Dashboard.stores.Organizer', {});
            store.load({
                params: {
                    uid: "/zport/dmd/Locations"
                }
            });

            var fields = [{
                xtype: 'combo',
                name: 'baselocation',
                queryMode: 'local',
                store: store,
                displayField: 'name',
                valueField: 'uid',
                fieldLabel: _t('Base Location'),
                value: this.baselocation
            }, {
                xtype: 'numberfield',
                name: 'pollingrate',
                fieldLabel: _t('Geocode Polling Rate'),
                value: this.pollingrate
            }];
            return fields;
        }
    });



    /**
     * Portlet that loads an Iframe.
     *
     **/
    Ext.define('Zenoss.Dashboard.portlets.SiteWindowPortlet', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.sitewindowportlet',
        height: 400,
        siteUrl: "about:blank",
        initComponent: function(){
            Ext.apply(this, {
                items: [{
                    xtype: 'iframe',
                    ref: 'mapIframe',
                    src: this.getIFrameSource()
                }]
            });
            this.callParent(arguments);
        },
        getIFrameSource: function() {
            return this.siteUrl;
        },
        getConfig: function() {
            return {
                siteUrl: this.siteUrl
            }
        },
        applyConfig: function(config) {
            this.callParent([config]);
            if (this.rendered){
                this.down('iframe').load(this.getIFrameSource())
            }
        },
        getCustomConfigFields: function() {
            var fields = [{
                xtype: 'textfield',
                name: 'siteUrl',
                fieldLabel: _t('Site URL'),
                value: this.siteUrl
            }];
            return fields;
        }
    });



    /**
     * @class Zenoss.Dashboard.model.DeviceIssueModel
     * @extends Ext.data.Model
     * Field definitions for the device issues grid
     **/
    Ext.define('Zenoss.Dashboard.model.DeviceIssueModel',  {
        extend: 'Ext.data.Model',
        idProperty: 'uid',
        fields: [
            {name: 'uid'},
            {name: 'name'},
            {name: 'events'},
            {name: 'icon'},
        ]
    });

    /**
     * @class Zenoss.Dashboard.stores.DeviceIssues
     * @extend Zenoss.DirectStore
     * Direct store for loading organizers
     */
    Ext.define("Zenoss.Dashboard.stores.DeviceIssues", {
        extend: "Zenoss.NonPaginatedStore",
        constructor: function(config) {
            config = config || {};
            Ext.applyIf(config, {
                model: 'Zenoss.Dashboard.model.DeviceIssueModel',
                initialSortColumn: "name",
                directFn: Zenoss.remote.DashboardRouter.getDeviceIssues,
                root: 'data'
            });
            this.callParent(arguments);
        }
    });

    /**
     * Device Issues Portlet. Shows devices that have events
     * @extends Zenoss.Dashboard.view.Portlet
     **/
    Ext.define('Zenoss.Dashboard.portlets.DeviceIssues', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.deviceissuesportlet',
        height: 400,
        initComponent: function(){
            var store = Ext.create('Zenoss.Dashboard.stores.DeviceIssues', {});
            store.load({
                params: {
                    keys: Ext.pluck(Zenoss.Dashboard.model.DeviceIssueModel.prototype.fields.items, 'name')
                }
            });

            Ext.apply(this, {
                items: [{
                    xtype: 'grid',
                    emptyText: _t('No records found.'),
                    store: store,
                    columns: [{
                        dataIndex:'icon',
                        header: _t('Icon'),
                        width: 40,
                        renderer: function(value) {
                            return Ext.String.format("<image height=\"32\"src='{0}' />", value);
                        }
                    },{
                        dataIndex: 'name',
                        header: _t('Device'),
                        flex: 1,
                        hideable: false,
                        renderer: function(name, row, record) {
                            return Zenoss.render.Device(record.data.uid, name);
                        }
                    },{
                        width: 75,
                        dataIndex: 'events',
                        header: _t('Events'),
                        sortable: false,
                        renderer: function(ev, ignored, record) {
                            var table = Zenoss.render.worstevents(ev),
                            url = record.data.uid + '/devicedetail?filter=default#deviceDetailNav:device_events';
                            if (table){
                                table = table.replace('table', 'table onclick="location.href=\''+url+'\';"');
                            }
                            return table;
                        }
                    }]
                }]
            });
            this.callParent(arguments);
        }
    });


    /**
     * @class Zenoss.Dashboard.model.DaemonProcessDown
     * @extends Ext.data.Model
     * Field definitions for the Daemon Process Down Grid
     **/
    Ext.define('Zenoss.Dashboard.model.DaemonProcessDown',  {
        extend: 'Ext.data.Model',
        idProperty: 'process',
        fields: [
            {name: 'host'},
            {name: 'process'},
            {name: 'secondsDown'}
        ]
    });

    /**
     * @class Zenoss.Dashboard.stores.DaemonProcessDown
     * @extend Zenoss.DirectStore
     */
    Ext.define("Zenoss.Dashboard.stores.DaemonProcessDownStore", {
        extend: "Zenoss.NonPaginatedStore",
        constructor: function(config) {
            config = config || {};
            Ext.applyIf(config, {
                model: 'Zenoss.Dashboard.model.DaemonProcessDown',
                initialSortColumn: "process",
                autoLoad: true,
                directFn: Zenoss.remote.DashboardRouter.getDaemonProcessesDown,
                root: 'data'
            });
            this.callParent(arguments);
        }
    });

    /**
     * Daemon Processes Down Portlet. Shows daemons that are down by the heart beat
     * @extends Zenoss.Dashboard.view.Portlet
     **/
    Ext.define('Zenoss.Dashboard.portlets.DaemonProcessDown', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.daemonprocessportlet',
        height: 250,
        initComponent: function(){
            Ext.apply(this, {
                items: [{
                    xtype: 'grid',
                    emptyText: _t('No records found.'),
                    store: Ext.create('Zenoss.Dashboard.stores.DaemonProcessDownStore', {}),
                    columns: [{
                        dataIndex:'host',
                        header: _t('Host'),
                        width: 120
                    },{
                        dataIndex: 'process',
                        header: _t('Daemon Process'),
                        flex: 1,
                        hideable: false
                    },{
                        width: 120,
                        dataIndex: 'secondsDown',
                        header: _t('Seconds Down'),
                        align: 'right',
                        sortable: false
                    },{
                        dataIndex: 'monitor',
                        header: _t('Monitor'),
                        with: 120,
                        hideable: false
                    }]
                }]
            });
            this.callParent(arguments);
        }
    });

    /**
     * Daemon Processes Down Portlet. Shows daemons that are down by the heart beat
     * @extends Zenoss.Dashboard.view.Portlet
     **/
    Ext.define('Zenoss.Dashboard.portlets.ProductionState', {
        extend: 'Zenoss.Dashboard.view.Portlet',
        alias: 'widget.productionstateportlet',
        height: 250,
        productionStates: [300],
        initComponent: function(){
            Zenoss.env.initProductionStates();
            var store = Ext.create('Zenoss.DeviceStore', {});
            store.setBaseParam('uid', '/zport/dmd/Devices');
            store.setBaseParam('keys', ['uid', 'name', 'productionState']);
            store.setParamsParam('productionState', this.productionStates);
            store.load();
            Ext.apply(this, {
                items: [{
                    xtype: 'grid',
                    emptyText: _t('No records found.'),
                    store: store,
                    columns: [{
                        dataIndex: 'name',
                        header: _t('Device'),
                        flex: 1,
                        hideable: false,
                        renderer: function(name, row, record) {
                            return Zenoss.render.Device(record.data.uid, name);
                        }
                    },{
                        dataIndex: 'productionState',
                        header: _t('Production State'),
                        hideable: false,
                        renderer: function(value) {
                            return Zenoss.env.PRODUCTION_STATES_MAP[value];
                        }
                    }]
                }]
            });
            this.callParent(arguments);
        },
        getConfig: function() {
            return {
                productionStates: this.productionStates
            }
        },
        applyConfig: function(config) {
            if (this.rendered) {
                var grid = this.down('grid');
                grid.getStore().setParamsParam('productionState', config.productionStates);
                grid.getStore().load();
            }
            this.callParent([config]);
        },
        getCustomConfigFields: function() {
            var me = this;
            var fields = [{
                xtype: 'ProductionStateCombo',
                fieldLabel: _t('Production State'),
                name: 'productionStates',
                // bug with multi select combo where we have to update the
                // value after we have rendered otherwise it wont take effect
                value: me.productionStates,
                listeners: {
                    afterrender: function(combo) {
                        combo.setValue(me.productionStates);
                    }
                },
                multiSelect: true,
                height: 100,
                width: 200
            }];
            return fields;
        }
    });

}())
