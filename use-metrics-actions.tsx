import { useMemo } from 'react';

import { AvailableUserPermission } from 'core/entities/user/user-permissions';
import { createCsvURL, buildCSV } from 'utils/create-csv/create-csv';
import { useMetricsCoverageLabel } from '../common/hooks/use-metrics-coverage-label';
import {
    useWidgetContentWithEnabledPOIs,
    useWidgetSettings,
    useWidgetFetchFilters,
    useWidgetVisualFilters,
    useIsWidgetInLimitedMode,
} from 'extensions/widget/hooks/use-widget-hooks';
import { getLabelByValue } from 'utils/get-label-by-value/get-label-by-value';
import { createDownloadCsvButtonOption } from 'extensions/widget-download-link';
import {
    ChainsMetricsContentModel,
    ChainsMetricsWidgetContent,
    ChainsMetricsContentModelKeys,
} from '../content/chains-metrics-content-model';
import { getSimpleFormatRange } from 'utils/date/date';

const PANEL_VISITS_VALUE = 'panel_visits' as const;
const COVERAGE_VALUE = 'coverage' as const;
const NO_DATA = 'N/A';

export const useMetricsActions = (exportPermission: AvailableUserPermission) => {
    const widgetContent = useWidgetContentWithEnabledPOIs<
        ChainsMetricsContentModel
    >();
    const { granularity } = useWidgetFetchFilters();
    const { panelData } = useWidgetVisualFilters();
    const { granularity: filterOptions } = useWidgetSettings();
    const isLimitedView = useIsWidgetInLimitedMode();
    const filterLabel = getLabelByValue(granularity, filterOptions);
    const coverageLabel = useMetricsCoverageLabel();

    const csvTitleOptions = useMemo(
        () =>
            [
                {
                    value: 'estimated_foottraffic',
                    label: 'Est. # of Visits',
                },
                {
                    value: PANEL_VISITS_VALUE,
                    label: 'Panel Visits',
                },
                {
                    value: 'average_per_venue',
                    label: 'Avg Visit/Venue',
                },
                {
                    value: COVERAGE_VALUE,
                    label: coverageLabel,
                },
                {
                    value: 'number_of_venues',
                    label: '# of Venues',
                },
            ] as const,
        [coverageLabel],
    );

    let csvURL = '/';
    let fileName = `Metrics - ${filterLabel}.csv`;

    if (!widgetContent.length) {
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
            filters: { date_start, date_end },
        } = poi;

        return `${name} / ${fullAddress} | ${getSimpleFormatRange(
            date_start,
            date_end,
        )}`;
    });

    const enabledFields = csvTitleOptions.filter((titleOption) => {
        if (titleOption.value === PANEL_VISITS_VALUE) {
            return panelData;
        }

        return true;
    });

    const reportValueOutcome = (
        poiContent: ChainsMetricsWidgetContent,
        value: ChainsMetricsContentModelKeys,
    ) => {
        const contentByFilter = poiContent.content[value];

        switch (value) {
            case COVERAGE_VALUE:
                return isLimitedView
                    ? NO_DATA
                    : (contentByFilter as number) / 100;
            default:
                return contentByFilter;
        }
    };

    const csvData = enabledFields.map((item) => {
        const { label, value } = item;
        let datasetData: Array<string | number> = [];

        for (let j = 0; widgetContent.length > j; j++) {
            const poiContent = widgetContent[j];
            const contentByFilter = reportValueOutcome(poiContent, value);

            const reportValue = contentByFilter ? contentByFilter : NO_DATA;

            datasetData.push(reportValue);
        }

        return [label, ...datasetData];
    });

    csvURL = createCsvURL(buildCSV([' ', ...headers], csvData));
    fileName = `Metrics - ${filterLabel}.csv`;

    return {
        downloadButtonOptions: [
            createDownloadCsvButtonOption(csvURL, fileName, exportPermission),
        ],
    };
};
