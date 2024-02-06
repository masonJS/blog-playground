 class WebClient {
  static create = (url, timeout) => new WebClientService(url, timeout);
}

class WebClientService {
  #option = {
      method: 'GET',
      headers: {
          'Content-Type': 'application/json'
      },
  };
  #url;
  #timeout ;

  constructor(url, timeout = 5000) {
      this.#url = url;
      this.#timeout = timeout;
  }

  get() {
      this.#option.method = 'GET';

      return this;
  }

  post() {
      this.#option.method = 'POST';

      return this;
  }

  async retrieve() {
    try {
      const response = await fetch(this.#url, {
        ...this.#option,
        signal: AbortSignal.timeout(this.#timeout)
      });

      return await response.json();

    } catch (e) {
      if (e.name === 'TimeoutError') {
        throw new WebClientResponseError('Request timeout');
      }
      throw new WebClientResponseError(e.message);
    }
  }
}

class WebClientResponseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WebClientResponseError';
  }
}

module.exports = {
  WebClient,
}
