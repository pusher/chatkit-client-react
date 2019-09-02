import Chatkit from "@pusher/chatkit-client"
import PropTypes from "prop-types"
import React from "react"
import TestRenderer from "react-test-renderer"

import core from "../src/core"
import ChatkitFake from "./chatkit-fake"

jest.mock("@pusher/chatkit-client")

describe("withChatkitOneToOne higher-order-component", () => {
  Chatkit.ChatManager = ChatkitFake.ChatManager
  Chatkit.CurrentUser = ChatkitFake.CurrentUser

  const instanceLocator = "v1:test:f83ad143-342f-4085-9639-9a809dc96466"
  const tokenProvider = new Chatkit.TokenProvider({
    url: "https://customer-site.com/pusher-auth",
  })
  const userId = "alice"

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
      expect(value.userId).toBe(userId)
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
        <WrappedComponent text={"some_value"} />
      </core.ChatkitProvider>
    )

    const renderer = TestRenderer.create(page)
    const result = renderer.toJSON()

    expect(result.children).toEqual(["some_value"])
  })
})
