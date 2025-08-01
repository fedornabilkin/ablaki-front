import params from './params';
import messages from './messages';

export default {
    getParam(name) {
        return params[name];
    },

    makeApiUrl(url) {
        return params.apiDomain + url;
    },

    getMessage(name) {
        return messages[name];
    }
}
