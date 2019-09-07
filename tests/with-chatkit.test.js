import Chatkit from "@pusher/chatkit-client"
import PropTypes from "prop-types"
import React from "react"
import TestRenderer from "react-test-renderer"

import core from "../src/core"
import ChatkitFake from "./chatkit-fake"
import testHelpers from "./helpers"

jest.mock("@pusher/chatkit-client")

describe("withChatkit higher-order-component", () => {
  Chatkit.ChatManager = ChatkitFake.ChatManager
  Chatkit.CurrentUser = ChatkitFake.CurrentUser

  const instanceLocator = "v1:test:f83ad143-342f-4085-9639-9a809dc96466"
  const tokenProvider = new Chatkit.TokenProvider({
    url: "https://customer-site.com/pusher-auth",
  })
  const userId = "alice"

  const runInTestRenderer = ({ resolveWhen, onLoad }) =>
    testHelpers.runInTestRenderer({
      instanceLocator,
      tokenProvider,
      userId,
      higherOrderComponent: core.withChatkit,
      resolveWhen,
      onLoad,
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
    })
  })

  it("should have a readable display name", () => {
    class SomeComponent extends React.Component {
      render() {
        return null
      }
    }
    const WrappedComponent = core.withChatkit(SomeComponent)
    expect(WrappedComponent.displayName).toBe("WithChatkit(SomeComponent)")
  })

  it("should forward props to nested component", () => {
    const TestComponentWithProps = props => {
      return <div>{props.text}</div>
    }
    TestComponentWithProps.propTypes = {
      text: PropTypes.string,
    }
    const WrappedComponent = core.withChatkit(TestComponentWithProps)

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
