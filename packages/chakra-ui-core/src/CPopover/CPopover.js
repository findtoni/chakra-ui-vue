import { useId, cloneVNode, getElement, isVueComponent, forwardProps } from '../utils'
import styleProps, { baseProps } from '../config/props'
import { isFunction } from 'lodash-es'

import CBox from '../CBox'
import CCloseButton from '../CCloseButton'
import CFragment from '../CFragment'
import { CPopper, CPopperArrow } from '../CPopper'

const CPopover = {
  name: 'CPopover',
  provide () {
    return {
      $PopoverContext: () => this.PopoverContext
    }
  },
  props: {
    id: String,
    defaultIsOpen: Boolean,
    isOpen: Boolean,
    returnFocusOnClose: {
      type: Boolean,
      default: true
    },
    initialFocusRef: [Object, String, Function],
    trigger: {
      type: String,
      default: 'click'
    },
    closeOnBlur: {
      type: Boolean,
      default: true
    },
    closeOnEscape: {
      type: Boolean,
      default: true
    },
    usePortal: Boolean,
    placement: {
      type: String,
      default: 'auto'
    }
  },
  computed: {
    PopoverContext () {
      return {
        set: this.set,
        isOpen: this._isOpen,
        closePopover: this.closePopover,
        openPopover: this.openPopover,
        toggleOpen: this.toggleOpen,
        triggerNode: this.triggerNode,
        contentNode: this.contentNode,
        setTriggerNode: this.setTriggerNode,
        popoverId: this.computedId,
        trigger: this.trigger,
        isHovering: this.isHovering,
        handleBlur: this.handleBlur,
        closeOnEscape: this.closeOnEscape,
        headerId: this.headerId,
        bodyId: this.bodyId,
        usePortal: this.usePortal,
        placement: this.placement
      }
    },
    isControlled () {
      return this.isOpen !== false
    },
    _isOpen: {
      get () {
        return this.isControlled ? this.isOpen : this.isOpenValue
      },
      set (value) {
        this.isOpenValue = value
      }
    },
    _initialFocusRef () {
      return isFunction(this.initialFocusRef)
        ? this.getNode(this.initialFocusRef())
        : this.getNode(this.initialFocusRef)
    },
    headerId () {
      return `${this.computedId}-header`
    },
    bodyId () {
      return `${this.computedId}-body`
    },
    computedId () {
      return this.id || `popover-id-${useId()}`
    }
  },
  data () {
    return {
      isOpenValue: this.defaultIsOpen || false,
      triggerNode: undefined,
      contentNode: undefined,
      prevIsOpen: false,
      isHovering: false
    }
  },
  mounted () {
    /**
     * The purpose of this watcher is to keep record of the previous
     * isOpen value.
     */
    this.$watch('_isOpen', (_newVal, oldVal) => {
      this.prevIsOpen = oldVal
    }, {
      immediate: true
    })

    this.$watch(vm => [
      vm._isOpen,
      vm._initialFocusRef,
      vm.trigger,
      vm.contentNode,
      vm.triggerNode,
      vm.prevIsOpen,
      vm.returnFocusOnClose
    ], () => {
      if (this._isOpen && this.trigger === 'click') {
        /**
         * Caveat here:
         * Until Vue 3 is release, using it's $refs as props may not always return a value
         * in the props unless the consumer component updates it's context. This is because
         * Vue asynchronously updtaes the DOM and is also not reactive.
         *
         * Where this doesnt' work, we fallback to using an element selector to query
         * the element from the DOM. And use it as the initial focus ref.
         *
         * Work-around could be to use plain old JS selectors
         */
        setTimeout(() => {
          if (this._initialFocusRef) {
            this._initialFocusRef.focus()
          } else {
            if (this.contentNode) {
              this.contentNode.focus()
            }
          }
        })
      }

      if (!this._isOpen && this.prevIsOpen && this.trigger === 'click' && this.returnFocusOnClose) {
        if (this.triggerNode) {
          this.triggerNode.focus()
        }
      }
    })
  },
  methods: {
    /**
     * Closes popover
     */
    closePopover () {
      if (!this.isControlled) {
        this._isOpen = false
      }
      this.$emit('close')
    },
    /**
     * Opens popover
     */
    openPopover () {
      if (!this.isControlled) {
        this._isOpen = true
      }
      this.$emit('open')
    },
    /**
     * Toggles disclosure state of popover
     */
    toggleOpen () {
      if (!this.isControlled) {
        this._isOpen = !this._isOpen
      }

      if (this._isOpen !== true) {
        this.$emit('open')
      } else {
        this.$emit('close')
      }
    },
    /**
     * Handles blur event
     * @param {Event} e `blur` event object
     */
    handleBlur (event) {
      if (
        this._isOpen &&
        this.closeOnBlur &&
        this.contentNode &&
        this.triggerNode &&
        !this.contentNode.contains(event.relatedTarget) &&
        !this.triggerNode.contains(event.relatedTarget)
      ) {
        this.closePopover()
      }
    },
    /**
     * Returns the HTML element of a Vue component or native element
     * @param {Vue.Component|HTMLElement|String} element HTMLElement or Vue Component
     */
    getNode (element) {
      if (typeof element === 'object') {
        const isVue = isVueComponent(element)
        return isVue ? element.$el : element
      } else if (typeof element === 'string') {
        return getElement(element)
      }
      return null
    },
    /**
     * Sets the value of any component instance property.
     * This function is to be passed down to context so that consumers
     * can mutate context values with out doing it directly.
     * Serves as a temporary fix until Vue 3 comes out
     * @param {String} prop Component instance property
     * @param {Any} value Property value
     */
    set (prop, value) {
      this[prop] = value
      return this[prop]
    }
  },
  render (h) {
    return h(CFragment, [
      this.$scopedSlots.default({
        isOpen: this._isOpen,
        onClose: this.closePopover
      })
    ])
  }
}

const CPopoverTrigger = {
  name: 'CPopoverTrigger',
  inject: ['$PopoverContext'],
  computed: {
    triggerId () {
      return `popover-trigger-${useId()}`
    },
    context () {
      return this.$PopoverContext()
    },
    headerId () {
      return this.context.headerId
    },
    bodyId () {
      return this.context.bodyId
    },
    eventHandlers () {
      const { trigger } = this.context

      if (trigger === 'click') {
        return {
          click: (e) => {
            this.$emit('click', e)
            this.context.toggleOpen()
          }
        }
      }

      if (trigger === 'hover') {
        return {
          focus: (e) => {
            this.$emit('focus', e)
            this.context.openPopover()
          },
          keydown: (e) => {
            this.$emit('keydown', e)
            if (e.key === 'Escape') {
              setTimeout(this.context.closePopover(), 300)
            }
          },
          blur: (e) => {
            this.$emit('blur', e)
            this.context.closePopover()
          },
          mouseenter: (e) => {
            this.$emit('mouseenter', e)
            this.context.set('isHovering', true)
            setTimeout(this.context.openPopover(), 300)
          },
          mouseleave: (e) => {
            this.$emit('mouseleave', e)
            this.context.set('isHovering', false)
            setTimeout(() => {
              if (this.context.isHovering === false) {
                this.context.closePopover()
              }
            }, 300)
          }
        }
      }
    }
  },
  mounted () {
    const { set } = this.context
    this.$nextTick(() => {
      const triggerNode = getElement(`#${this.triggerId}`)
      if (!triggerNode) {
        console.warn('[Chakra-ui]: Unable to locate PopoverTrigger node')
      } else {
        set('triggerNode', triggerNode)
      }
    })
  },
  render (h) {
    let clone
    const children = this.$slots.default.filter(e => e.tag)
    if (!children) return console.error('[Chakra-ui]: Popover Trigger expects at least one child')
    if (children.length && children.length > 1) return console.error('[Chakra-ui]: Popover Trigger can only have a single child element')
    const cloned = cloneVNode(children[0], h)

    const { isOpen, popoverId } = this.context

    clone = h(cloned.componentOptions.Ctor, {
      ...cloned.data,
      ...(cloned.componentOptions.listeners || {}),
      props: {
        ...(cloned.data.props || {}),
        ...cloned.componentOptions.propsData
      },
      attrs: {
        id: this.triggerId,
        'aria-haspopup': 'dialog',
        'aria-expanded': isOpen,
        'aria-controls': popoverId
      },
      nativeOn: this.eventHandlers
    }, cloned.componentOptions.children)

    return clone
  }
}

const CPopoverContent = {
  name: 'CPopoverContent',
  inject: ['$PopoverContext', '$chakraColorMode'],
  props: {
    ...styleProps,
    gutter: {
      type: [Number, String],
      default: 4
    },
    ariaLabel: String
  },
  computed: {
    context () {
      return this.$PopoverContext()
    },
    contentId () {
      return `popover-content-${useId()}`
    },
    colorMode () {
      return this.$chakraColorMode()
    },
    eventHandlers () {
      const { trigger, handleBlur, closePopover, closeOnEscape } = this.context

      let eventHandlers = {}

      if (trigger === 'click') {
        eventHandlers = {
          blur: (e) => {
            this.$emit('blur', e)
            handleBlur(e)
          }
        }
      }

      if (trigger === 'hover') {
        eventHandlers = {
          ...eventHandlers,
          mouseenter: (e) => {
            this.$emit('mouseenter', e)
            this.context.set('isHovering', true)
            setTimeout(this.context.openPopover(), 300)
          },
          mouseleave: (e) => {
            this.$emit('mouseleave', e)
            this.context.set('isHovering', false)
            setTimeout(() => {
              if (this.context.isHovering === false) {
                this.context.closePopover()
              }
            }, 300)
          }
        }
      }

      eventHandlers = {
        ...eventHandlers,
        keydown: (e) => {
          this.$emit('keydown', e)
          if (e.key === 'Escape' && closeOnEscape) {
            closePopover && closePopover()
          }
        }
      }

      return eventHandlers
    },
    calculatedAttrs () {
      const { trigger } = this.context
      if (trigger === 'click') {
        return {
          role: 'dialog',
          'aria-modal': 'false'
        }
      }

      if (trigger === 'hover') {
        return {
          role: 'tooltip'
        }
      }
    }
  },
  mounted () {
    const { set, popoverId } = this.context
    this.$nextTick(() => {
      const contentNode = getElement(`#${popoverId}`)
      if (!contentNode) {
        console.warn('[Chakra-ui]: Unable to locate PopoverContent node')
      } else {
        set('contentNode', contentNode)
      }
    })
  },
  render (h) {
    const { isOpen, triggerNode, popoverId, usePortal, placement } = this.context
    const bg = this.colorMode === 'light' ? 'white' : 'gray.700'

    return h(CPopper, {
      props: {
        as: 'section',
        usePortal: usePortal,
        isOpen,
        placement,
        anchorEl: triggerNode,
        modifiers: [{
          name: 'offset',
          options: {
            offset: [0, this.gutter]
          }
        }],
        bg,
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        rounded: 'md',
        shadow: 'sm',
        maxWidth: 'xs',
        _focus: { outline: 0, shadow: 'outline' },
        ...forwardProps(this.$props)
      },
      attrs: {
        id: popoverId,
        tabIndex: -1,
        'aria-labelledby': this.headerId,
        'aria-describedby': this.bodyId,
        'aria-label': this.ariaLabel,
        'aria-hidden': !isOpen,
        ...this.calculatedAttrs
      },
      nativeOn: this.eventHandlers
    }, this.$slots.default)
  }
}

const CPopoverHeader = {
  name: 'CPopoverHeader',
  inject: ['$PopoverContext'],
  props: baseProps,
  computed: {
    context () {
      return this.$PopoverContext()
    },
    headerId () {
      return this.context.headerId
    }
  },
  render (h) {
    return h(CBox, {
      props: {
        as: 'header',
        px: '0.75rem',
        py: '0.5rem',
        borderBottomWidth: '1px',
        ...forwardProps(this.$props)
      },
      attrs: {
        id: this.headerId
      }
    }, this.$slots.default)
  }
}

const CPopoverBody = {
  name: 'CPopoverBody',
  props: baseProps,
  inject: ['$PopoverContext'],
  computed: {
    context () {
      return this.$PopoverContext()
    },
    bodyId () {
      return this.context.bodyId
    }
  },
  render (h) {
    return h(CBox, {
      props: {
        flex: 1,
        px: '0.75rem',
        py: '0.5rem',
        ...forwardProps(this.$props)
      },
      attrs: {
        id: this.bodyId,
        'data-id': this.bodyId
      }
    }, this.$slots.default)
  }
}

const CPopoverArrow = {
  name: 'CPopoverArrow',
  props: baseProps,
  render (h) {
    return h(CPopperArrow, {
      props: forwardProps(this.$props)
    })
  }
}

const CPopoverCloseButton = {
  name: 'CPopoverCloseButton',
  inject: ['$PopoverContext'],
  props: styleProps,
  computed: {
    context () {
      return this.$PopoverContext()
    }
  },
  render (h) {
    return h(CCloseButton, {
      props: {
        size: 'sm',
        pos: 'absolute',
        rounded: 'md',
        top: 1,
        right: 2,
        p: 2,
        ...forwardProps(this.$props)
      },
      on: {
        click: (e) => {
          this.$emit('click', e)
          this.context.closePopover()
        }
      }
    })
  }
}

const CPopoverFooter = {
  name: 'CPopoverFooter',
  props: baseProps,
  render (h) {
    return h(CBox, {
      props: {
        as: 'footer',
        px: '0.75rem',
        py: '0.5rem',
        borderTopWidth: '1px',
        ...forwardProps(this.$props)
      }
    }, this.$slots.default)
  }
}

export {
  CPopover,
  CPopoverTrigger,
  CPopoverContent,
  CPopoverHeader,
  CPopoverBody,
  CPopoverArrow,
  CPopoverCloseButton,
  CPopoverFooter
}
