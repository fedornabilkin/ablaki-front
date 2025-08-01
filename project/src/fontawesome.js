import {library} from '@fortawesome/fontawesome-svg-core'
import * as icons from '@fortawesome/free-solid-svg-icons'

let myIcons = [
    'faUser',
    'faUserCheck',
    'faSignInAlt',
    'faSignOutAlt',
    'faPlus',

    'faStar',

    'faComments',
    'faQuestionCircle',

    'faDollarSign',
    'faGraduationCap',
    'faAdjust',
    'faAppleAlt',
    'faCrosshairs',

    'faArrowAltCircleRight',
    'faCheck',
    'faPencilAlt',
    'faClone',

    'faEye',
    'faEyeSlash',

    'faFileExcel',
    'faCogs',
    'faExchangeAlt',
    'faPowerOff',
    'faLock',
    'faSearch',
    'faCircle',
    'faCheckCircle',
    'faTrashAlt',
    'faBan',
    'faTimesCircle',
    'faBox',
    'faTimes'
];

myIcons.forEach(function(item) {
    library.add(icons[item]);
});
