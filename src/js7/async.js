var first = new Promise((res, rej) => {
    setTimeout(function () {
        console.log('first');
        res('f');
    }, 5000);
});

var arr = [];
var a;
var b = 2;

function doPromise(text, num, end) {
    return new Promise((res, rej) => {
        setTimeout(function () {
            a = num;
            b = num + 1;
            arr.push(text);
            res(end);
        }, 1000);
    });
}

(async function wait() {
    await doPromise('promise 1', 5, 'pr1');
    console.log(arr, a + b);
    await doPromise('promise 2', 12, 'pr2');
    console.log(arr, a + b);
})();

