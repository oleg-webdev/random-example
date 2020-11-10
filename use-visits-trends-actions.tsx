import { head, last } from 'lodash/fp';
import moment from 'moment';

import { AvailableUserPermission } from 'core/entities/user/user-permissions';
import { createCsvURL, buildCSV } from 'utils/create-csv/create-csv';
import {
    useWidgetVisualFilters,
    useWidgetSettings,
    useWidgetFetchFilters,
    useWidgetContentWithEnabledPOIs,
} from 'extensions/widget/hooks/use-widget-hooks';
import { getLabelByValue } from 'utils/get-label-by-value/get-label-by-value';
import {
    ChainsVisitsTrendWidgetPoiContentType,
    VisitTrendsVisualFiltersType,
} from '../content/chains-visits-trend-content';
import { dateFormats } from 'utils/date/date';
import { useChartBinsData } from '../hooks/use-chart-bins-data';
import { createDownloadCsvButtonOption } from 'extensions/widget-download-link';

const getDatesRangeString = (bins: string[]) => {
    const startDate = moment(head(bins)).format(dateFormats.shortDayMonthYear);
    const endDate = moment(last(bins)).format(dateFormats.shortDayMonthYear);

    if (!startDate || !endDate) return '';

    return ` | ${startDate} - ${endDate}`;
};

export const useVisitsTrendActions = (exportPermission: AvailableUserPermission) => {
    const widgetContent = useWidgetContentWithEnabledPOIs<
        ChainsVisitsTrendWidgetPoiContentType
    >();
    const { chartBins, isEqualStartDate } = useChartBinsData();
    const { metrics } = useWidgetVisualFilters<VisitTrendsVisualFiltersType>();
    const { granularity } = useWidgetFetchFilters();
    const {
        metrics: metricsOptions,
        granularity: granularityOptions,
    } = useWidgetSettings();

    const metricsFilterLabel = getLabelByValue(metrics, metricsOptions);
    const granularityFilterLabel = getLabelByValue(
        granularity,
        granularityOptions,
    );

    let csvURL = '/';
    let fileName = `Visits Trend - ${metricsFilterLabel}.csv`;

    if (!widgetContent.length || !chartBins.length) {
        return {
            downloadButtonOptions: [
                createDownloadCsvButtonOption(
                    csvURL,
                    fileName,
                    exportPermission,
                ),
            ],
        };
    }

    const headers = widgetContent.map((poi) => {
        const {
            name,
            fullAddress,
            content: { bins = [] },
        } = poi;
        const dateRange = getDatesRangeString(bins);

        return `${name} / ${fullAddress} ${dateRange}`;
    });

    const csvData = chartBins.map((label: string, index: number) => {
        let datasetData: Array<string | number> = [];
        const currentBinDisplay = isEqualStartDate ? label : index + 1;

        for (let j = 0; widgetContent.length > j; j++) {
            const poiContent = widgetContent[j];
            const contentByFilter = poiContent.content[metrics];
            const indexOfValue = isEqualStartDate
                ? poiContent.content.bins?.indexOf(label) || index
                : index;

            const reportValue = contentByFilter
                ? contentByFilter[indexOfValue]
                : 'no-data';
            datasetData.push(reportValue);
        }

        return [currentBinDisplay.toString(), ...datasetData];
    });

    csvURL = createCsvURL(buildCSV([' ', ...headers], csvData));
    fileName = `Visits Trend - ${metricsFilterLabel} - ${granularityFilterLabel}.csv`;

    return {
        downloadButtonOptions: [
            createDownloadCsvButtonOption(csvURL, fileName, exportPermission),
        ],
    };
};
