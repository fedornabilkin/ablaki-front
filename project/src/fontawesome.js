import {library} from '@fortawesome/fontawesome-svg-core'
import * as icons from '@fortawesome/free-solid-svg-icons'

let myIcons = [
  'faUser',
  'faUsers',
  'faDice',
  'faHouse',
  'faCity',
  'faSeedling',
  'faStore',
  'faIndustry',
  'faLandmark',
  'faUserCheck',
  'faSignInAlt',
  'faSignOutAlt',
  'faPlus',
  'faIdCard',

  'faStar',
  'faCoins',
  'faTrophy',

  'faComments',
  'faComment',
  'faCrown',
  'faPaperPlane',
  'faEllipsisV',
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

  'faSun',
  'faMoon',

  'faHammer',
  'faTree',
  'faCube',
  'faCubes',
  'faLink',
  'faScroll',
  'faFire',
  'faFireFlameCurved',
  'faGem',
  'faBullseye',
  'faToolbox',
  'faMountain',
  'faGripLines',
  'faWrench',
  'faRing',
  'faAnchor',
  'faBottleWater',
  'faPenNib',
  'faShirt',
  'faShield',
  'faShieldHalved',
  'faCartShopping',
  'faBagShopping',
];

export class IconManager {
  constructor() {
    myIcons.forEach(function (item) {
      library.add(icons[item]);
    });
  }
}
