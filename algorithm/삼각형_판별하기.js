// 세 길이를 입력받아 삼각형이 만들어지는지 확인

function solution(a, b, c) {
    const max = Math.max(a, b, c);

    if (max === a) {
        return max === b + c ? 'YES' : 'NO'
    }

    if (max === b) {
        return max === a + c ? 'YES' : 'NO'
    }

    return max === a + b ? 'YES' : 'NO'

}

