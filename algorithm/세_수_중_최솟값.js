// 세 수 중 최솟값 구하기

function solution(a, b, c) {
    let answer;
    if (a < b) answer = a;
    else answer = b;
    if (c < answer) answer = c;
    return answer;
}
