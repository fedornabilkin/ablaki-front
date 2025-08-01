export const errorHandler = (e, errors) => {
    if (!errors.hasOwnProperty("404")) {
        errors['404'] = () => alert("something сломалось")
    }
    if (!e.response) {
        console.log("Ошибка Интернета");
    } else {
        Object.keys(errors).map(function (key) {
            let error = String(e.response.data.message);
            let errorCode = String(e.response.status);

            if (error === key || errorCode === key) {
                errors[key]();
            }
        })
    }
}
