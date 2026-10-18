# Noticeflow

The notification delivery domain in Noticeflow. These terms describe domain concepts, not implementation choices.

## Language

**Notification**:
A delivery request submitted by a caller with a Topic, title, and content. Two submissions with identical content are distinct Notifications.

**Topic**:
An exact-match routing key that determines the Targets for a Notification.
_Avoid_: Fuzzy category, subscription condition

**Target**:
A configured delivery destination with an associated Channel. The Target set for a Notification is fixed when it is Accepted.
_Avoid_: Topic, Channel

**Channel**:
A delivery mechanism associated with a Target.
_Avoid_: Target, MCP client

**Delivery**:
An independent record of one Notification being delivered to one Target, with its own processing outcome.
_Avoid_: Notification

**Accepted**:
The state in which a Notification and all its Deliveries are durably recorded and committed to subsequent processing. It does not indicate successful delivery through a Channel.
_Avoid_: Sent, delivered
