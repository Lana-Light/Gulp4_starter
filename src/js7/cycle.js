//module.exports = function() {
let nums = [];
for (let i = 0; i < 5; i++) {
    nums.push(function () {
        console.log(i);
    });
}

for (let i of nums) i();
//};