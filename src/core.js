import chatkit from "@pusher/chatkit-client"
import React from "react"

/**
 *  React Context used to supply a configured instance of the Chatkit
 *  JavaScript SDK throughout your application.
 */
const ChatkitContext = React.createContext()

/**
 * Wrapper component used to take Chatkit connection configuration
 * (instance ID, token provider, user ID, etc.) and injects a configured
 * Chatkit SDK instance via a React Context.
 * @extends React.Component
 */
export class ChatkitProvider extends React.Component {
  constructor() {
    super()
    this.state = {
      chatkit: {
        chatManager: null,
        currentUser: null,
      },
    }
  }

  componentDidMount() {
    const chatManager = new chatkit.ChatManager({
      instanceLocator: this.props.instanceLocator,
      tokenProvider: this.props.tokenProvider,
      userId: this.props.userId,
    })

    chatManager
      .connect()
      .then(currentUser => {
        this.setState({ chatkit: { chatManager, currentUser } })
      })
      .catch(error => {
        // TODO: Error logging?
        console.error(error)
      })
  }

  render() {
    return (
      <ChatkitContext.Provider value={this.state}>
        {this.props.children}
      </ChatkitContext.Provider>
    )
  }
}

/**
 * Wraps the given component and injects a Chatkit JavaScript SDK instance under
 * props.chatkit:
 * <pre><code>
 *    props.chatkit.currentUser // Reference to the CurrentUser object
 *    props.chatkit.chatManager // Reference to the ChatManager object
 * </code></pre>
 * @params{React.Component} WrappedComponent - Custom React component you would
 *      like to inject the Chatkit SDK into
 * @return{React.Component} A wrapped version of your component with the Chatkit
 *      SDK injected under props.chatkit
 */
export const withChatkit = WrappedComponent => {
  class WithChatkit extends React.Component {
    render() {
      return <WrappedComponent chatkit={this.context.chatkit} {...this.props} />
    }
  }
  WithChatkit.contextType = ChatkitContext
  WithChatkit.displayName = `WithChatkit(${getDisplayName(WrappedComponent)})`
  return WithChatkit
}

const getDisplayName = WrappedComponent => {
  return WrappedComponent.displayName || WrappedComponent.name || "Component"
}

export default { ChatkitProvider, withChatkit }
