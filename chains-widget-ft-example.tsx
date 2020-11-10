import React, { useCallback } from 'react';
import moment from 'moment';

import { ChainsWidgetFactory } from 'features/chains/store/chains-store';
import Widget from 'extensions/widget/widget-component';
import { WidgetModel } from 'extensions/widget/models/widget-model';
import { ChainsFtVarianceActions } from './components/actions/chains-ft-variance-actions';
import { ChainsFtVarianceFilters } from './components/filters/chains-ft-variance-filters';
import { ChainsFtVarianceContent } from './components/content/chains-ft-variance-content';
import { getChainsBasedAccessLevel } from 'features/chains/services/chains-access-levels-service';
import { useWidgetModel } from 'extensions/widget/hooks/use-widget-hooks';
import { WidgetPoiSelect } from 'extensions/widget/components/widget-poi-select/widget-poi-select';
import { WidgetPoi } from 'extensions/widget/models/widget-poi-provider-type';
import { isLessThanFullWeeksNumber } from 'utils/date/date';
import { useReportPlaces } from 'extensions/widget/hooks/use-poi-hooks';
import { useSplunkCallback } from 'hooks/use-splunk-callback/use-splunk-callback';
import { isRegionNationwide } from 'core/services/regions-service';

const defaultSplunkData = {
    component: 'chains-visits-variance',
    state: 'admin-panel.chains.variance',
};

const getRegionName = (entity: any) => {
    const { area } = entity;

    return isRegionNationwide(area) ? area.type : area.name;
};

export const ChainsFtVarianceComponent = () => {
    const { title } = useWidgetModel();
    const { entities } = useReportPlaces();
    const sendEvent = useSplunkCallback(defaultSplunkData);

    const disablePOI = useCallback(({ filters }: WidgetPoi) => {
        const endDate = moment(filters.date_end);
        const startDate = moment(filters.date_start);

        return (
            isLessThanFullWeeksNumber({
                startDate: startDate,
                endDate: endDate,
                number: 2,
            }) ||
            isLessThanFullWeeksNumber({
                startDate: '2017-01-15',
                endDate: endDate,
                number: 2,
            })
        );
    }, []);

    const onSplunkCallback = (uid: string) => {
        const { originalEntity } = entities[uid];

        sendEvent({
            action: 'button-click',
            btn_name: 'select-chain',
            value: `${originalEntity.name} / ${getRegionName(originalEntity)}`,
        });
    };

    return (
        <Widget
            dataType="chainsFtVariance"
            permission="show_chains_ft_variance"
        >
            <Widget.Title elevioId="80">{title}</Widget.Title>
            <Widget.VenueSelector>
                <WidgetPoiSelect
                    splunkCallback={onSplunkCallback}
                    title="Chain"
                    disabled={disablePOI}
                />
            </Widget.VenueSelector>
            <Widget.FastFilters>
                <ChainsFtVarianceFilters />
            </Widget.FastFilters>
            <Widget.Actions>
                <ChainsFtVarianceActions />
            </Widget.Actions>
            <Widget.Content>
                <ChainsFtVarianceContent />
            </Widget.Content>
        </Widget>
    );
};

ChainsFtVarianceComponent.getModel = (): WidgetModel => ({
    title: 'Visits Variance',
    type: 'chains-ft-variance',
    settings: {
        granularity: [
            {
                value: 'week',
                label: 'Weekly',
            },
            {
                value: 'month',
                label: 'Monthly',
                lockInLimitedMode: true,
            },
        ],
        widgetConstraints: {
            minWeeksReportDateRange: 2,
        },
    },
    fetchFilter: {
        granularity: 'week',
        compare_to: 'granularity',
    },
    getWidgetUiMode: getChainsBasedAccessLevel,
});

export const ChainsFtVarianceWidget = ChainsWidgetFactory.createWidget(
    ChainsFtVarianceComponent,
);
