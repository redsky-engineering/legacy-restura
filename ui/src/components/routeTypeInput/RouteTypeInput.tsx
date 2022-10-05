import * as React from 'react';
import {Box, Label, Select} from '@redskytech/framework/ui';
import { useRecoilValue} from "recoil";
import globalState from "../../state/globalState";
import {useMemo} from "react";
import serviceFactory from "../../services/serviceFactory";
import SchemaService from "../../services/schema/SchemaService";

interface RouteTypeInputProps {
    routeData: Restura.RouteData | undefined;
}

const RouteTypeInput : React.FC<RouteTypeInputProps> = (props) => {
    const schemaService = serviceFactory.get<SchemaService>('SchemaService');
    const selectedRoute = useRecoilValue<{ baseUrl: string; path: string } | undefined>(
        globalState.selectedRoute
    );

    const routeTypeOptions = useMemo(() => {
        return [
            { label: 'One Item', value: 'ONE' },
            { label: 'Array of Items', value: 'ARRAY' },
            { label: 'Paginated List', value: 'PAGE' },
            { label: 'Custom', value: 'CUSTOM' }
        ];
    }, []);

    if (!selectedRoute || !props.routeData) return null;

	return (
		<Box className={'rsRouteTypeInput'}>
            <Box>
                <Label variant={'body1'} weight={'regular'} mb={4}>
                    Type
                </Label>
                <Select
                    value={routeTypeOptions.find((item) => item.value === props.routeData!.type)}
                    options={routeTypeOptions}
                    onChange={(newValue) => {
                        if (!newValue) return;
                        schemaService.updateRouteData(
                            {
                                ...props.routeData,
                                type: newValue.value as Restura.StandardRouteData['type']
                            } as Restura.StandardRouteData,
                            selectedRoute.path,
                            selectedRoute.baseUrl
                        );
                    }}
                />
            </Box>
		</Box>
	)
};

export default RouteTypeInput;
