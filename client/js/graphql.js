
async function gqlFetch(query, variables = {}) {
    const res = await fetch('/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ query, variables })
    });

    // если сервер вернул 401 (Express может вернуть 401 при проверке cookie в GraphQL context)
    if (res.status === 401) {
        // поднимаем ошибку авторизации для обработчика на клиенте
        const err = new Error('Authentication required');
        err.status = 401;
        throw err;
    }

    const json = await res.json();

    if (json.errors && json.errors.length) {
        const msg = json.errors.map(e => e.message).join('; ');
        const error = new Error(msg);
        error.graphql = json.errors;
        throw error;
    }

    return json.data;
}
