export * from './model/slice';
export * from './model/selectors';
export * from './api/stopApi';
export { StopProductsList } from './ui/StopProductsList';
export {
    getNextDistrictStop,
    buildNextStopSlides,
    getClientDistrictId,
    formatLocatorPlaceName,
} from './lib/getNextDistrictStop';

export { default as stopReducer } from './model/slice';
