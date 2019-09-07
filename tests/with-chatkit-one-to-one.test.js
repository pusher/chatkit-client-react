import Chatkit from "@pusher/chatkit-client"
import PropTypes from "prop-types"
import React from "react"
import TestRenderer from "react-test-renderer"

import core from "../src/core"
import ChatkitFake from "./chatkit-fake"
import testHelpers from "./helpers"

jest.mock("@pusher/chatkit-client")

beforeEach(() => {
  ChatkitFake.fakeAPI.reset()
  ChatkitFake.fakeAPI.createUser({ id: "alice" })
  ChatkitFake.fakeAPI.createUser({ id: "bob" })
})

describe("withChatkitOneToOne higher-order-component", () => {
  Chatkit.ChatManager = ChatkitFake.ChatManager
  Chatkit.CurrentUser = ChatkitFake.CurrentUser
  Chatkit.User = ChatkitFake.User
  Chatkit.Room = ChatkitFake.Room

  const instanceLocator = "v1:test:f83ad143-342f-4085-9639-9a809dc96466"
  const tokenProvider = new Chatkit.TokenProvider({
    url: "https://customer-site.com/pusher-auth",
  })
  const userId = "alice"
  const otherUserId = "bob"

  const runInTestRenderer = ({ resolveWhen, onLoad }) =>
    testHelpers.runInTestRenderer({
      instanceLocator,
      tokenProvider,
      userId,
      higherOrderComponent: core.withChatkitOneToOne,
      resolveWhen,
      onLoad,
      wrappedComponentProps: {
        otherUserId,
      },
    })

  it("should inject a properly configured ChatManager", () => {
    return runInTestRenderer({
      resolveWhen: props => props.chatkit.chatManager !== null,
    }).then(({ props }) => {
      const chatManager = props.chatkit.chatManager
      expect(chatManager).toBeInstanceOf(Chatkit.ChatManager)
      expect(chatManager.instanceLocator).toBe(instanceLocator)
      expect(chatManager.tokenProvider).toBe(tokenProvider)
      expect(chatManager.userId).toBe(userId)
      expect(chatManager.connected).toBe(true)
    })
  })

  it("should inject a properly configured CurrentUser", () => {
    return runInTestRenderer({
      resolveWhen: props => props.chatkit.currentUser !== null,
    }).then(({ props }) => {
      const currentUser = props.chatkit.currentUser
      expect(currentUser).toBeInstanceOf(Chatkit.CurrentUser)
      expect(currentUser.id).toBe(userId)
    })
  })

  it("should inject isLoading and update appropriately", () => {
    return runInTestRenderer({
      resolveWhen: props => !props.chatkit.isLoading,
    }).then(({ props, initialProps }) => {
      expect(initialProps.chatkit.isLoading).toBe(true)

      expect(props.chatkit.isLoading).toBe(false)
      expect(props.chatkit.currentUser).toBeInstanceOf(Chatkit.CurrentUser)
      expect(props.chatkit.otherUser).toBeInstanceOf(Chatkit.User)
    })
  })

  it("should have a readable display name", () => {
    class SomeComponent extends React.Component {
      render() {
        return null
      }
    }
    const WrappedComponent = core.withChatkitOneToOne(SomeComponent)
    expect(WrappedComponent.displayName).toBe(
      "WithChatkitOneToOne(SomeComponent)",
    )
  })

  it("should forward props to nested component", () => {
    const TestComponentWithProps = props => {
      return <div>{props.text}</div>
    }
    TestComponentWithProps.propTypes = {
      text: PropTypes.string,
    }
    const WrappedComponent = core.withChatkitOneToOne(TestComponentWithProps)

    const page = (
      <core.ChatkitProvider
        instanceLocator={instanceLocator}
        tokenProvider={tokenProvider}
        userId={userId}
      >
        <WrappedComponent text={"some_value"} otherUserId={otherUserId} />
      </core.ChatkitProvider>
    )

    const renderer = TestRenderer.create(page)
    const result = renderer.toJSON()

    expect(result.children).toEqual(["some_value"])
  })

  it("should NOT forward config props for the HOC", () => {
    return runInTestRenderer({
      resolveWhen: () => true,
    }).then(({ props }) => {
      expect(props.otherUserId).toBe(undefined)
    })
  })

  it("should inject otherUser via props", () => {
    return runInTestRenderer({
      resolveWhen: props => props.chatkit.otherUser !== null,
    }).then(({ props }) => {
      const otherUser = props.chatkit.otherUser
      expect(otherUser).toBeInstanceOf(Chatkit.User)
      expect(otherUser.id).toBe(otherUserId)
    })
  })

  it("should start inject messages as empty array if there are no messages", () => {
    return runInTestRenderer({
      resolveWhen: props => !props.chatkit.isLoading,
    }).then(({ initialProps, props }) => {
      expect(initialProps.chatkit.messages).toEqual([])
      expect(props.chatkit.messages).toEqual([])
    })
  })

  it("should update messages in props when a new message is received", () => {
    const messageParts = [
      {
        type: "text/plain",
        content: "Hi!",
      },
    ]
    return runInTestRenderer({
      onLoad: () => {
        ChatkitFake.fakeAPI.createMessage({
          roomId: ChatkitFake.makeOneToOneRoomId(userId, otherUserId),
          senderId: otherUserId,
          parts: messageParts,
        })
      },
      resolveWhen: props => props.chatkit.messages.length !== 0,
    }).then(({ props }) => {
      expect(props.chatkit.messages).toHaveLength(1)
      const message = props.chatkit.messages[0]
      expect(message.parts).toEqual(messageParts)
    })
  })

  it("should inject a working sendSimpleMessage method", () => {
    return runInTestRenderer({
      onLoad: props => {
        props.chatkit.sendSimpleMessage({
          text: "MY_MESSAGE",
        })
      },
      resolveWhen: props => props.chatkit.messages.length > 0,
    }).then(() => {
      const room = ChatkitFake.fakeAPI.getRoom({
        id: ChatkitFake.makeOneToOneRoomId(userId, otherUserId),
      })
      expect(room.messages).toHaveLength(1)
      const message = room.messages[0]
      expect(message.parts).toEqual([
        {
          type: "text/plain",
          content: "MY_MESSAGE",
        },
      ])
    })
  })

  it("should inject a working sendMultipartMessage method", () => {
    return runInTestRenderer({
      onLoad: props => {
        props.chatkit.sendMultipartMessage({
          parts: [
            {
              type: "application/json",
              content: "2019",
            },
          ],
        })
      },
      resolveWhen: props => props.chatkit.messages.length > 0,
    }).then(() => {
      const room = ChatkitFake.fakeAPI.getRoom({
        id: ChatkitFake.makeOneToOneRoomId(userId, otherUserId),
      })
      expect(room.messages).toHaveLength(1)
      const message = room.messages[0]
      expect(message.parts).toEqual([
        {
          type: "application/json",
          content: "2019",
        },
      ])
    })
  })

  it("should set otherUser.isTyping to true on userStartedTyping", () => {
    const roomId = ChatkitFake.makeOneToOneRoomId(userId, otherUserId)

    return runInTestRenderer({
      resolveWhen: props => !props.chatkit.isLoading,
    })
      .then(({ props }) => {
        expect(props.chatkit.otherUser.isTyping).toEqual(false)
      })
      .then(() =>
        runInTestRenderer({
          onLoad: () => {
            ChatkitFake.fakeAPI.sendTypingEvent({ roomId, userId: otherUserId })
          },
          resolveWhen: props =>
            !props.chatkit.isLoading &&
            props.chatkit.otherUser.isTyping != false,
        }),
      )
      .then(({ props }) => {
        expect(props.chatkit.otherUser.isTyping).toEqual(true)
      })
  })

  it("should trigger a typing event when sendTypingEvent is called", () => {
    const roomId = ChatkitFake.makeOneToOneRoomId(userId, otherUserId)

    return new Promise(resolve => {
      class TestComponent extends React.Component {
        constructor() {
          super()
          this._onLoadHasRun = false
        }

        componentDidUpdate() {
          if (!this.props.chatkit.isLoading && !this._onLoadHasRun) {
            this.props.chatkit.sendTypingEvent()
            this._onLoadHasRun = true
            resolve()
          }
        }

        render() {
          return null
        }
      }
      TestComponent.propTypes = {
        chatkit: PropTypes.object,
      }

      const WrappedComponent = core.withChatkitOneToOne(TestComponent)

      const page = (
        <core.ChatkitProvider
          instanceLocator={instanceLocator}
          tokenProvider={tokenProvider}
          userId={userId}
        >
          <WrappedComponent otherUserId={otherUserId} />
        </core.ChatkitProvider>
      )

      TestRenderer.create(page)
    }).then(() => {
      const typingEvents = ChatkitFake.fakeAPI.typingEvents
      expect(typingEvents).toHaveLength(1)
      expect(typingEvents[0].userId).toEqual(userId)
      expect(typingEvents[0].roomId).toEqual(roomId)
    })
  })

  it("should trigger a render when there is an incoming presence change", () => {
    return runInTestRenderer({
      onLoad: () => {
        ChatkitFake.fakeAPI.sendPresenceEvent({
          userId: otherUserId,
          newState: "online",
        })
      },
      resolveWhen: props => {
        return (
          !props.chatkit.isLoading &&
          props.chatkit.otherUser.presence.state === "online"
        )
      },
    }).then(({ props }) => {
      expect(props.chatkit.otherUser.presence.state).toEqual("online")
    })
  })

  it("should set otherUser.lastReadMessageId to the initial value on load", () => {
    const roomId = ChatkitFake.makeOneToOneRoomId(userId, otherUserId)
    const lastReadMessageId = 42
    ChatkitFake.fakeAPI.createRoom({
      id: roomId,
      userIds: [userId, otherUserId],
    })
    ChatkitFake.fakeAPI.setCursor({
      userId: otherUserId,
      roomId,
      position: lastReadMessageId,
    })

    return runInTestRenderer({
      resolveWhen: props => !props.chatkit.isLoading,
    }).then(({ props }) => {
      expect(props.chatkit.otherUser.lastReadMessageId).toEqual(
        lastReadMessageId,
      )
    })
  })

  it("should set otherUser.lastReadMessageId to the latest value", () => {
    const roomId = ChatkitFake.makeOneToOneRoomId(userId, otherUserId)
    const lastReadMessageId = 42

    return runInTestRenderer({
      onLoad: () => {
        ChatkitFake.fakeAPI.setCursor({
          userId: otherUserId,
          roomId,
          position: lastReadMessageId,
        })
      },
      resolveWhen: props => {
        return (
          !props.chatkit.isLoading &&
          props.chatkit.otherUser.lastReadMessageId !== undefined
        )
      },
    }).then(({ props }) => {
      expect(props.chatkit.otherUser.lastReadMessageId).toEqual(
        lastReadMessageId,
      )
    })
  })
})
