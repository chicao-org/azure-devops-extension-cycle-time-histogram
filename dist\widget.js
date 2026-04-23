(() => {
    let $chart = $('#chart');
    let $message = $('#message');
    let $title = $('#title');

    const getChartConfiguration = (data, percentiles) => {
        let config = {
            type: 'BarPercentile',
            data: {
                labels: data.map(d => d.cycleTime),
                datasets: [
                    {
                        label: "Items",
                        backgroundColor: "#79AEC8",
                        borderColor: "#417690",
                        data: data.map(d => d.items),
                        percentiles: percentiles != '' ? percentiles.split(',').map(percentile => parseInt(percentile, 10)) : []
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 3,
                scales: { y: { title: { text: 'Items', display: 'true' } }, x: { title: { text: 'Cycle Times', display: 'true' } } },
                plugins: {
                    title:  { display: false },
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        };

        return config;
    };

    const getData = (settings) => {
        let deferred = $.Deferred();

        AzureDevOps.Queries.getById(settings.query).then(query => {
            AzureDevOps.Queries.getItems(query).then(itemsFromQuery => {
                let cycleTimes = [];

                itemsFromQuery.forEach(item => {
                    let startValue = item[settings.cycleTimeStartField];
                    let endValue = item[settings.cycleTimeEndField];

                    if (startValue !== undefined && startValue != null && startValue != '' && endValue !== undefined && endValue != null && endValue != '')
                    {
                        let startDate = new Date(startValue);
                        let endDate = new Date(endValue);

                        cycleTimes.push(Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1);
                    }
                });

                let groups = cycleTimes.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
                let min = Math.min(...cycleTimes);
                let max = Math.max(...cycleTimes);

                let items = [];
                for (let index = min; index <= max; index++) {
                    items.push({ cycleTime: index, items: groups[index] ?? 0 });
                }

                deferred.resolve(items);
            });
        });

        return deferred.promise();
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

    const load = (widgetSettings) => {
        let settings = getSettings(widgetSettings); 

        $title.text(settings.title);

        getData(settings).then(data => {
            prepareChart(data, settings.percentiles);
        });
    };

    const prepareChart = (data, percentiles) => {
        $chart.show();
        $message.hide();

        if (data.length == 0) {
            $chart.hide();
            $message.show();

            $message.text('There aren\'t data to show');
        }

        let chartArea = document.getElementById('chart');
        let chart = new Chart(chartArea, getChartConfiguration(data, percentiles));
    };

    window.LoadWidget = load;
})();