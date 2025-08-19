import {library} from '@fortawesome/fontawesome-svg-core'
import * as icons from '@fortawesome/free-solid-svg-icons'

let myIcons = [
  'faUser',
  'faUserCheck',
  'faSignInAlt',
  'faSignOutAlt',
  'faPlus',
  'faIdCard',

  'faStar',
  'faCoins',
  'faTrophy',

  'faComments',
  'faQuestionCircle',

  'faDollarSign',
  'faGraduationCap',
  'faAdjust',
  'faAppleAlt',
  'faCrosshairs',

  'faArrowAltCircleRight',
  'faArrowDown',
  'faArrowUp',
  'faArrowRight',
  'faArrowLeft',
  'faCheck',
  'faPencilAlt',
  'faClone',

  'faEye',
  'faEyeSlash',

  'faExclamationCircle',

  'faFileExcel',
  'faCogs',
  'faCog',
  'faSpinner',
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
  'faTimes',
];

export class IconManager {
  constructor() {
    myIcons.forEach(function (item) {
      library.add(icons[item]);
    });
  }
}
