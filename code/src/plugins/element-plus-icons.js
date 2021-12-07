import * as elementPlusIcons from '@element-plus/icons';

export const setupElementPlusIcons = (app) => {
    Object.keys(elementPlusIcons).forEach((icon) => {
        const iconRender = elementPlusIcons[icon]
        app.component(icon, iconRender)
    })
}