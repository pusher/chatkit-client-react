export class ChatManager {
  constructor({ instanceLocator, tokenProvider, userId, ...options } = {}) {
    if (typeof instanceLocator !== "string") {
      throw new Error(
        `instance locator must be a string, got ${instanceLocator}`,
      )
    }
    const fetchToken = tokenProvider.fetchToken
    if (typeof fetchToken !== "function") {
      throw new Error(
        "tokenProvider does not implement the TokenProvider interface",
      )
    }
    if (typeof userId !== "string") {
      throw new Error(`userId must be a string, got ${userId}`)
    }

    this.instanceLocator = instanceLocator
    this.tokenProvider = tokenProvider
    this.userId = userId
    this.connected = false
  }

  connect() {
    return new Promise(resolve => {
      this.connected = true
      resolve(
        new CurrentUser({
          userId: this.userId,
        }),
      )
    })
  }
}

export class CurrentUser {
  constructor({ userId } = {}) {
    this.userId = userId
  }
}

export default { ChatManager, CurrentUser }
