// 9명의 요소중 7명의 요소를 뽑아 합이 100이 되는 경우를 찾는다.

function solution(arr) {
    let answer = []
    for (let i = 0; i < arr.length; i++) {
        let sum = arr.reduce((a, b) => a + b, 0);
        for (let j = i + 1; j < arr.length; j++) {
            if (sum - arr[i] - arr[j] === 100) {
                for (let k = 0; k < arr.length; k++) {
                    if (k !== i && k !== j) {
                        answer.push(arr[k])
                    }
                }
            }
        }
    }
    return answer;
}

const arr = [20, 7, 23, 19, 10, 15, 25, 8, 13];


console.log(solution(arr))
