var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const Bottleneck = require('bottleneck');
const { validateInitOptions, validateRequestParams } = require('./../helpers');
const { limiterOptions: LIMITER_OPTIONS, defaultAPIParams: DEFAULT_API_PARAMS } = require('./../enums');
const ErrorEmitter = require('@ErrorEmitter');
const getMethodData = require('./../API/v/helpers/get_method_data');
const fetchAPI = require('./../API/fetch');
const buildRequestParams = require('./../helpers/build_request_params');
const STATE = {};
const v1 = require('./v1');
const v2 = require('./v2');
module.exports = class MarketAPI {
    /**
     *
     * @param {Object} initOptions - take options and create state
     */
    constructor(initOptions = {}) {
        this.state = {
            APIErrorsToJSON: false,
            APIParams: {
                currency: 'USD',
                language: 'en'
            },
            getWarnings: false,
            /**
             * Limiter options be always used cause the limit 5 requests/sec seems to stay for a long time (14.04.2021)
             */
            limiter: new Bottleneck(LIMITER_OPTIONS),
            APIKey: undefined
        };
        /**
         * Validate init options with Joi.
         * No args or false value will be assigned to an object
         */
        validateInitOptions(initOptions);
        const { APIErrorsToJSON, APIKey, getWarnings, APIParams = {} } = initOptions;
        /**
         * Create independent state from passed options argument
         */
        this.state = {
            /**
             *  Check if client would like to get Market API errors as JSON w/o throwing
             *  Default is false
             */
            APIErrorsToJSON: APIErrorsToJSON || this.state.APIErrorsToJSON,
            /**
             * Check if client would like to get warnings
             */
            getWarnings: getWarnings || this.state.getWarnings,
            /**
             * Limiter options be always used cause the limit 5 requests/sec seems to stay for a long time (14.04.2021)
             */
            limiter: this.state.limiter,
            APIKey: APIKey || null,
            /**
             * Params to be used during API calls
             */
            APIParams: {
                /**
                 * Save currency  and use it if the client won't pass this param in functions calls. Default is USD
                 */
                currency: APIParams.currency || DEFAULT_API_PARAMS.currency,
                language: APIParams.language || DEFAULT_API_PARAMS.language,
                /**
                 * App id being used in the filename of DB json. Can be passed in the method getDBName by the client
                 */
                marketAppId: APIParams.marketAppId || DEFAULT_API_PARAMS.marketAppId,
            },
        };
        /**
         *
         * @type {Function} - bind class builder to this
         */
        this.callMethod = this.callMethod.bind(this);
        /**
         * Create getter v1 to be called like APIProvider.v1.pingPong()
         */
        Object.defineProperty(this, 'v1', { get: v1.bind(this) });
        /**
         * Create getter v2 to be called like APIProvider.v2.getMoney()
         */
        Object.defineProperty(this, 'v2', { get: v2.bind(this) });
    }
    /**
     *
     * @param {any} customParam
     * @returns {Object} - returns init options and client's param to test class initialization
     */
    test(customParam) {
        return Object.assign(Object.assign({}, this.initOptions), { customParam });
    }
    /**
     * @param {Object} reqParams
     * @param {String} version
     * @param {String} methodName
     * @returns {Function} - takes request params, version and method name and returns
     * a class method like APIProvider.v1.someMethod({param1: 'string'})
     */
    callMethod(reqParams = {}, version, methodName) {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * Import method from method props object
             */
            const METHOD_DATA = getMethodData(version)[methodName];
            /**
             * Check if method is private and API key is not passed
             */
            this.checkAPIKey.call(this, METHOD_DATA.isPrivate);
            /**
             * Check if params object is valid
             */
            validateRequestParams(reqParams, METHOD_DATA.requestValidationSchema);
            /**
             *
             * @type {Object} Build params from
             * request params and state object set in constructor and pass it to API caller
             */
            const REQUEST_PARAMS = buildRequestParams(reqParams, this.state);
            /**
             * Call API fetcher by limiter schedule with METHOD object and request params concat
             */
            return this.state.limiter.schedule(() => fetchAPI(METHOD_DATA, REQUEST_PARAMS, this.state)
                /**
                 * Check if error returned and process it
                 */
                .then(APIResponse => this.processAPIError.call(this, APIResponse, METHOD_DATA, REQUEST_PARAMS))
                .then(APIResponse => APIResponse));
        });
    }
    /**
     * Check response for errors and return JSON or throw smth
     * @param APIResponse
     * @param method
     * @param reqParams
     * @returns {any}
     */
    processAPIError(APIResponse, method, reqParams) {
        /**
         * If response is not successful and option is to return JSON, return it. Or throw an error
         */
        return APIResponse.success ? APIResponse : (!APIResponse.success && reqParams.APIErrorsToJSON) ? APIResponse : ErrorEmitter.emit('API_Error', APIResponse);
    }
    /**
     * Check if method requires auth and API key was not passed
     * @param methodIsPrivate
     * @returns {boolean}
     */
    checkAPIKey(methodIsPrivate = false) {
        return !this.state.APIKey && methodIsPrivate && ErrorEmitter.emit('client_error', 'no_api_key_for_private_method');
    }
};
//# sourceMappingURL=MarketAPI.js.map