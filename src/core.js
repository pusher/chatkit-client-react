import chatkit from "@pusher/chatkit-client"
import PropTypes from "prop-types"
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
 * @example
 *  <ChatkitProvider
 *    instanceLocator={<YOUR_INSTANCE_ID_HERE>}
 *    tokenProvider={<YOUR_TOKEN_PROVIDER_HERE>}
 *    userId={<CURRENT_USER_ID_HERE>}
 *  >
 *    <App>
 *      Your application
 *    </App>
 *  </ChatkitProvider>
 * @extends React.Component
 */
export class ChatkitProvider extends React.Component {
  constructor() {
    super()
    this.state = {
      chatkit: {
        chatManager: null,
        currentUser: null,
        isLoading: true,
      },
      onLoadListeners: [],
    }
  }

  addOnLoadListener(listener) {
    this.setState(state => ({
      onLoadListeners: [listener, ...state.onLoadListeners],
    }))
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
        this.setState(
          {
            chatkit: { chatManager, currentUser, isLoading: false },
          },
          () => this.state.onLoadListeners.forEach(l => l()),
        )
      })
      .catch(error => {
        // TODO: Error logging?
        console.error(error)
      })
  }

  render() {
    return (
      <ChatkitContext.Provider
        value={{
          addOnLoadListener: l => this.addOnLoadListener(l),
          ...this.state,
        }}
      >
        {this.props.children}
      </ChatkitContext.Provider>
    )
  }
}

ChatkitProvider.propTypes = {
  instanceLocator: PropTypes.string.isRequired,
  tokenProvider: PropTypes.object.isRequired,
  userId: PropTypes.string.isRequired,
  children: PropTypes.any.isRequired,
}

/**
 * Wraps the given component and injects a Chatkit JavaScript SDK instance under
 * props.chatkit:
 *
 * @param {React.Component} WrappedComponent - Custom React component you would
 *      like to inject the Chatkit SDK into
 * @return {React.Component} A wrapped version of your component with the Chatkit
 *      SDK injected under props.chatkit
 *
 *
 * @example
 * const MyChatComponent = props => {
 *    // Base Chatkit SDK
 *    props.chatkit.currentUser // Reference to the CurrentUser object
 *    props.chatkit.chatManager // Reference to the ChatManager object
 * }
 *
 * export default withChatkitOneToOne(MyChatComponent);
 */
export function withChatkit(WrappedComponent) {
  class WithChatkit extends React.Component {
    render() {
      return <WrappedComponent chatkit={this.context.chatkit} {...this.props} />
    }
  }
  WithChatkit.contextType = ChatkitContext
  WithChatkit.displayName = `WithChatkit(${getDisplayName(WrappedComponent)})`
  return WithChatkit
}

/**
 * Wraps the given component and injects everything needed to create
 * one-to-one chat experinces under props.chatkit:
 *
 * @param {React.Component} WrappedComponent - Custom React component you would
 *      like to inject the Chatkit data into
 * @return {React.Component} A wrapped version of your component with the Chatkit
 *      SDK injected under props.chatkit
 *
 * @example
 * const MyChatComponent = props => {
 *    // Base Chatkit SDK
 *    props.chatkit.currentUser // Reference to the CurrentUser object
 *    props.chatkit.chatManager // Reference to the ChatManager object
 *
 *    // One-to-one chat data
 *    TODO
 * }
 *
 * export default withChatkitOneToOne(MyChatComponent);
 */
export function withChatkitOneToOne(WrappedComponent) {
  class WithChatkitOneToOne extends React.Component {
    constructor(props) {
      super(props)
      this.state = {
        otherUser: null,
        otherUserIsTyping: false,
        messages: [],
        isLoading: true,
      }
      this._currentUserId = null
      this._otherUserId = props.otherUserId

      this._roomId = null
    }

    _sendSimpleMessage({ text }) {
      return this.context.chatkit.currentUser.sendSimpleMessage({
        roomId: this._roomId,
        text,
      })
    }

    _sendMultipartMessage({ parts }) {
      return this.context.chatkit.currentUser.sendMultipartMessage({
        roomId: this._roomId,
        parts,
      })
    }

    componentDidMount() {
      this.context.addOnLoadListener(() => {
        this._currentUserId = this.context.chatkit.currentUser.id
        this._roomId = makeOneToOneRoomId(
          this._currentUserId,
          this._otherUserId,
        )

        const alreadyInRoom = this.context.chatkit.currentUser.rooms.some(
          r => r.id === this._roomId,
        )

        ;(alreadyInRoom
          ? Promise.resolve()
          : this.context.chatkit.currentUser.serverInstanceV6.request({
              method: "post",
              path: "/one_to_one_rooms",
              json: {
                user_id: this._otherUserId,
              },
            })
        )
          .then(() =>
            this.context.chatkit.currentUser.subscribeToRoomMultipart({
              roomId: this._roomId,
              hooks: {
                onMessage: message =>
                  this.setState(state => ({
                    messages: [...state.messages, message],
                  })),

                onUserStartedTyping: user => {
                  if (user.id === this._otherUserId) {
                    this.setState({ otherUserIsTyping: true })
                  }
                },

                onUserStoppedTyping: user => {
                  if (user.id === this._otherUserId) {
                    this.setState({ otherUserIsTyping: false })
                  }
                },
              },
            }),
          )
          .then(room =>
            this.setState({
              otherUser: room.users.find(u => u.id === this._otherUserId),
              isLoading: false,
            }),
          )
          .catch(err => console.error(err))
      })
    }

    render() {
      // NOTE: At some point, if customers find them useful, we may want to
      // add these properties to the JS SDK itself. We are adding them here
      // for now as a cheap way to experiment.
      let otherUser = null
      if (this.state.otherUser !== null) {
        otherUser = cloneUser(this.state.otherUser)
        otherUser.isTyping = this.state.otherUserIsTyping
      }

      return (
        <WrappedComponent
          chatkit={{
            ...this.context.chatkit,
            otherUser,
            messages: this.state.messages,
            isLoading: this.state.isLoading,
            sendSimpleMessage: options => this._sendSimpleMessage(options),
            sendMultipartMessage: options =>
              this._sendMultipartMessage(options),
          }}
          {...this.props}
        />
      )
    }
  }
  WithChatkitOneToOne.contextType = ChatkitContext
  WithChatkitOneToOne.displayName = `WithChatkitOneToOne(${getDisplayName(
    WrappedComponent,
  )})`
  WithChatkitOneToOne.propTypes = {
    otherUserId: PropTypes.string.isRequired,
  }

  return WithChatkitOneToOne
}

const getDisplayName = WrappedComponent => {
  return WrappedComponent.displayName || WrappedComponent.name || "Component"
}

const makeOneToOneRoomId = (idA, idB) => {
  if (idB > idA) {
    const temp = idA
    idA = idB
    idB = temp
  }
  return `${btoa(idA)}-${btoa(idB)}`
}

const cloneUser = user =>
  new chatkit.User(
    {
      avatarURL: user.avatarURL,
      createdAt: user.createdAt,
      customData: user.customData,
      id: user.id,
      name: user.name,
      updatedAt: user.updatedAt,
    },
    user.presenceStore,
  )

export default { ChatkitProvider, withChatkit, withChatkitOneToOne }
