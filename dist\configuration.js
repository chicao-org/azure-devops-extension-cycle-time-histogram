(() => {
    let $context = null;
    let $widgetEvent = null;

    let $title = $('#title');
    let $query = $('#query');
    let $cycleTimeStartField = $('#cycle-time-start-field');
    let $cycleTimeEndField = $('#cycle-time-end-field');
    let $percentiles = $('#percentiles');    

    const addQueryToSelect = (query, level) => {
        level = level ?? 0;

        if (query.isFolder ?? false) {
            $query.append($('<option>')
                .val(query.id)
                .html('&nbsp;&nbsp;'.repeat(level) + query.name)
                .attr('data-level', '0')
                .css('font-weight', 'bold')
                .attr('disabled', 'disabled'));

            if (query.children.length > 0)
            {
                query.children.forEach(innerQuery => {
                    addQueryToSelect(innerQuery, level + 1);
                });
            }

        } else {
            $query.append($('<option>')
                .val(query.id)
                .html('&nbsp;&nbsp;'.repeat(level) + query.name)
                .attr('data-level', level));
        }
    };

    const changeSettings = () => {
        settings = getSettingsToSave();

        let eventName = $widgetEvent.ConfigurationChange;
        let eventArgs = $widgetEvent.Args(settings);
        $context.notify(eventName, eventArgs);
    };    

    const getSettings = (widgetSettings) => {
        let raw = widgetSettings.customSettings.data;
        let settings = raw ? JSON.parse(raw) : {};

        return {
            title: settings?.title ?? 'Cycle Time',
            query: settings?.query ?? '',
            cycleTimeStartField: settings?.cycleTimeStartField ?? '',
            cycleTimeEndField: settings?.cycleTimeEndField ?? '',
            percentiles: settings?.percentiles ?? ''
        };
    };    

    const getSettingsToSave = () => {
        let percentiles = $percentiles
            .val()
            .split(',')
            .filter(p => !isNaN(parseInt(p, 10)))
            .join(',');

        return {
            data: JSON.stringify({
                title: $title.val(),
                query: $query.val(),
                cycleTimeStartField: $cycleTimeStartField.val(),
                cycleTimeEndField: $cycleTimeEndField.val(),
                percentiles: percentiles
            })
        };
    };

    const loadConfiguration = (settings, context, widgetEvent) => {
        $context = context;
        $widgetEvent = widgetEvent;

        prepareControls(getSettings(settings));
    };

    const prepareControls = (settings) => {
        let deferred = $.Deferred();

        AzureDevOps.Queries.getAllShared().then(queries => {
            $query.append($('<option>'));

            queries.forEach(query => {
                addQueryToSelect(query);
            });

            $title.on('change', changeSettings);
            $query.on('change', () => {
                var deferreds = [];                
                deferreds.push(updateDateFields($cycleTimeStartField, $cycleTimeStartField.val()));
                deferreds.push(updateDateFields($cycleTimeEndField, $cycleTimeEndField.val()));

                Promise.all(deferreds).then(_ => changeSettings());
            });
            $cycleTimeStartField.on('change', changeSettings);
            $cycleTimeEndField.on('change', changeSettings);
            $percentiles.on('change', changeSettings);

            $title.val(settings.title);
            $query.val(settings.query);
            $percentiles.val(settings.percentiles);

            var deferreds = [];                
            deferreds.push(updateDateFields($cycleTimeStartField, settings.cycleTimeStartField));
            deferreds.push(updateDateFields($cycleTimeEndField, settings.cycleTimeEndField));

            Promise.all(deferreds).then(_ => deferred.resolve());
        });

        return deferred.promise();
    };

    const updateDateFields = (dateField, currentValue) => {
        let deferred = $.Deferred();

        AzureDevOps.Queries.getFields($query.val()).then(fields => {
            dateField.html('');

            fields
                .filter(field => field.type == 2)
                .forEach(field => {
                    dateField.append($('<option>')
                        .val(field.referenceName)
                        .html(field.name));
                });

            if (fields.filter(field => field.referenceName == currentValue).length > 0)
            {
                dateField.val(currentValue);
            }
            else
            {
                dateField.val('');
            }

            deferred.resolve();
        });

        return deferred.promise();
    };

    window.LoadConfiguration = loadConfiguration;
    window.GetSettingsToSave = getSettingsToSave;
})();