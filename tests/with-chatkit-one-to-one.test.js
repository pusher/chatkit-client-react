import Chatkit from "@pusher/chatkit-client"
import PropTypes from "prop-types"
import React from "react"
import TestRenderer from "react-test-renderer"

import core from "../src/core"
import ChatkitFake from "./chatkit-fake"

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

  const TestComponent = props => {
    props.callback(props)
    return <div>Hello World</div>
  }
  TestComponent.propTypes = {
    callback: PropTypes.func.isRequired,
  }

  it("should inject a properly configured ChatManager", () => {
    const WrappedComponent = core.withChatkitOneToOne(TestComponent)

    return new Promise(resolve => {
      const page = (
        <core.ChatkitProvider
          instanceLocator={instanceLocator}
          tokenProvider={tokenProvider}
          userId={userId}
        >
          <WrappedComponent
            otherUserId={otherUserId}
            callback={props => {
              if (props.chatkit.chatManager !== null) {
                resolve(props.chatkit.chatManager)
              }
            }}
          />
        </core.ChatkitProvider>
      )
      const renderer = TestRenderer.create(page)
      renderer.toJSON()
    }).then(value => {
      expect(value).toBeInstanceOf(Chatkit.ChatManager)
      expect(value.instanceLocator).toBe(instanceLocator)
      expect(value.tokenProvider).toBe(tokenProvider)
      expect(value.userId).toBe(userId)
      expect(value.connected).toBe(true)
    })
  })

  it("should inject a properly configured CurrentUser", () => {
    const WrappedComponent = core.withChatkitOneToOne(TestComponent)

    return new Promise(resolve => {
      const page = (
        <core.ChatkitProvider
          instanceLocator={instanceLocator}
          tokenProvider={tokenProvider}
          userId={userId}
        >
          <WrappedComponent
            otherUserId={otherUserId}
            callback={props => {
              if (props.chatkit.currentUser !== null) {
                resolve(props.chatkit.currentUser)
              }
            }}
          />
        </core.ChatkitProvider>
      )
      const renderer = TestRenderer.create(page)
      renderer.toJSON()
    }).then(value => {
      expect(value).toBeInstanceOf(Chatkit.CurrentUser)
      expect(value.id).toBe(userId)
    })
  })

  it("should inject isLoading and update appropriately", () => {
    const WrappedComponent = core.withChatkitOneToOne(TestComponent)

    let firstValue = null
    return new Promise(resolve => {
      const page = (
        <core.ChatkitProvider
          instanceLocator={instanceLocator}
          tokenProvider={tokenProvider}
          userId={userId}
        >
          <WrappedComponent
            otherUserId={otherUserId}
            callback={props => {
              if (firstValue === null) {
                firstValue = props.chatkit.isLoading
              }
              if (!props.chatkit.isLoading) {
                resolve({
                  isLoading: props.chatkit.isLoading,
                  currentUser: props.chatkit.currentUser,
                  otherUser: props.chatkit.otherUser,
                })
              }
            }}
          />
        </core.ChatkitProvider>
      )
      const renderer = TestRenderer.create(page)
      renderer.toJSON()
    }).then(({ isLoading, currentUser, otherUser }) => {
      expect(firstValue).toBe(true)
      expect(isLoading).toBe(false)
      expect(currentUser).toBeInstanceOf(Chatkit.CurrentUser)
      expect(otherUser).toBeInstanceOf(Chatkit.User)
    })
  })

  it("should have a readable display name", () => {
    const WrappedComponent = core.withChatkitOneToOne(TestComponent)
    expect(WrappedComponent.displayName).toBe(
      "WithChatkitOneToOne(TestComponent)",
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

  it("should inject otherUser via props", () => {
    const WrappedComponent = core.withChatkitOneToOne(TestComponent)

    return new Promise(resolve => {
      const page = (
        <core.ChatkitProvider
          instanceLocator={instanceLocator}
          tokenProvider={tokenProvider}
          userId={userId}
        >
          <WrappedComponent
            otherUserId={otherUserId}
            callback={props => {
              if (props.chatkit.otherUser !== null) {
                resolve(props.chatkit.otherUser)
              }
            }}
          />
        </core.ChatkitProvider>
      )
      const renderer = TestRenderer.create(page)
      renderer.toJSON()
    }).then(value => {
      expect(value).toBeInstanceOf(Chatkit.User)
      expect(value.id).toBe(otherUserId)
    })
  })

  it("should start inject messages as empty array if there are no messages", () => {
    const WrappedComponent = core.withChatkitOneToOne(TestComponent)

    const observations = []

    return new Promise(resolve => {
      const page = (
        <core.ChatkitProvider
          instanceLocator={instanceLocator}
          tokenProvider={tokenProvider}
          userId={userId}
        >
          <WrappedComponent
            otherUserId={otherUserId}
            callback={props => {
              observations.push(props.chatkit.messages)
              if (!props.chatkit.isLoading) {
                resolve()
              }
            }}
          />
        </core.ChatkitProvider>
      )
      const renderer = TestRenderer.create(page)
      renderer.toJSON()
    }).then(() => {
      observations.forEach(messages => expect(messages).toEqual([]))
    })
  })

  it("should start inject messages as empty array if there are no messages", () => {
    const WrappedComponent = core.withChatkitOneToOne(TestComponent)

    const observations = []

    return new Promise(resolve => {
      const page = (
        <core.ChatkitProvider
          instanceLocator={instanceLocator}
          tokenProvider={tokenProvider}
          userId={userId}
        >
          <WrappedComponent
            otherUserId={otherUserId}
            callback={props => {
              observations.push(props.chatkit.messages)
              if (!props.chatkit.isLoading) {
                resolve()
              }
            }}
          />
        </core.ChatkitProvider>
      )
      const renderer = TestRenderer.create(page)
      renderer.toJSON()
    }).then(() => {
      observations.forEach(messages => expect(messages).toEqual([]))
    })
  })

  it("should update messages in props when a new message is received", () => {
    let message = null

    class TestComponentWithDidUpdate extends React.Component {
      render() {
        this.props.callback(this.props)
        return <div>Hello World</div>
      }

      componentDidUpdate() {
        if (!this.props.chatkit.isLoading && message === null) {
          message = ChatkitFake.fakeAPI.createMessage({
            roomId: ChatkitFake.makeOneToOneRoomId(userId, otherUserId),
            senderId: otherUserId,
            parts: "some parts yo",
          })
        }
      }
    }

    TestComponentWithDidUpdate.propTypes = {
      chatkit: PropTypes.object,
      callback: PropTypes.func.isRequired,
    }

    const WrappedComponent = core.withChatkitOneToOne(
      TestComponentWithDidUpdate,
    )

    return new Promise(resolve => {
      const page = (
        <core.ChatkitProvider
          instanceLocator={instanceLocator}
          tokenProvider={tokenProvider}
          userId={userId}
        >
          <WrappedComponent
            otherUserId={otherUserId}
            callback={props => {
              if (props.chatkit.messages.length > 0) {
                resolve(props.chatkit.messages)
              }
            }}
          />
        </core.ChatkitProvider>
      )
      const renderer = TestRenderer.create(page)
      renderer.toJSON()
    }).then(value => {
      expect(value).toEqual([message])
    })
  })

  it("should inject a working sendSimpleMessage method", () => {
    let message = null

    class TestComponentWithDidUpdate extends React.Component {
      render() {
        return <div>Hello World</div>
      }

      componentDidUpdate() {
        if (!this.props.chatkit.isLoading && message === null) {
          message = {
            text: "MY_MESSAGE",
          }
          this.props.chatkit.sendSimpleMessage(message)
          this.props.onComplete()
        }
      }
    }

    TestComponentWithDidUpdate.propTypes = {
      chatkit: PropTypes.object,
      onComplete: PropTypes.func.isRequired,
    }

    const WrappedComponent = core.withChatkitOneToOne(
      TestComponentWithDidUpdate,
    )

    return new Promise(resolve => {
      const page = (
        <core.ChatkitProvider
          instanceLocator={instanceLocator}
          tokenProvider={tokenProvider}
          userId={userId}
        >
          <WrappedComponent otherUserId={otherUserId} onComplete={resolve} />
        </core.ChatkitProvider>
      )
      const renderer = TestRenderer.create(page)
      renderer.toJSON()
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
    let messageParts = null

    class TestComponentWithDidUpdate extends React.Component {
      render() {
        return <div>Hello World</div>
      }

      componentDidUpdate() {
        if (!this.props.chatkit.isLoading && messageParts === null) {
          messageParts = [
            {
              type: "application/json",
              content: "2019",
            },
          ]
          this.props.chatkit.sendMultipartMessage({
            parts: messageParts,
          })
          this.props.onComplete()
        }
      }
    }

    TestComponentWithDidUpdate.propTypes = {
      chatkit: PropTypes.object,
      onComplete: PropTypes.func.isRequired,
    }

    const WrappedComponent = core.withChatkitOneToOne(
      TestComponentWithDidUpdate,
    )

    return new Promise(resolve => {
      const page = (
        <core.ChatkitProvider
          instanceLocator={instanceLocator}
          tokenProvider={tokenProvider}
          userId={userId}
        >
          <WrappedComponent otherUserId={otherUserId} onComplete={resolve} />
        </core.ChatkitProvider>
      )
      const renderer = TestRenderer.create(page)
      renderer.toJSON()
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
})
