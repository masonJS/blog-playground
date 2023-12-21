
const url = 'https://jsonplaceholder.typicode.com/todos/1';
const option = {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    },
    signal: AbortSignal.timeout(2000)
};

(async () => {
    const res = await fetch(url, option);
    const body = await res.json();

    console.log(res.status);
    console.log(body);
})()
