
import Vue from 'vue'
import wormhole from './wormhole'
import Target from './portal-target'
import { extractAttributes } from '../utils'

const inBrowser = (typeof window !== 'undefined')
const hasParentFrame = (inBrowser && window.parent)

let pid = 1

export default {
  abstract: true,
  name: 'portal',
  props: {
    /* global HTMLElement */
    disabled: { type: Boolean, default: false },
    name: { type: String, default: () => String(pid++) },
    order: { type: Number, default: 0 },
    slim: { type: Boolean, default: false },
    tag: { type: [String], default: 'DIV' },
    targetEl: { /* I give up */ },
    to: { type: String, default: () => String(Math.round(Math.random() * 10000000)) },
  },

  mounted () {
    if (this.targetEl) {
      this.mountToTarget()
    }
    if (!this.disabled) {
      this.sendUpdate()
    }
    // Destroy doesn't fire on a page unload.
    window.addEventListener('unload', this.destroy)
  },

  updated () {
    if (this.disabled) {
      this.clear()
    } else {
      this.sendUpdate()
    }
  },

  beforeDestroy () {
    this.destroy()
  },

  watch: {
    to (newValue, oldValue) {
      oldValue && this.clear(oldValue)
      this.sendUpdate()
    },
    targetEl (newValue, oldValue) {
      this.mountToTarget()
    },
  },

  methods: {

    sendUpdate () {
      if (this.to) {
        if (this.$slots.default) {
          wormhole.open({
            from: this.name,
            to: this.to,
            passengers: [...this.$slots.default],
            order: this.order,
          })
        } else {
          this.clear()
        }
      } else if (!this.to && !this.targetEl) {
        console.warn('[vue-portal]: You have to define a target via the `to` prop.')
      }
    },

    clear (target) {
      wormhole.close({
        from: this.name,
        to: target || this.to,
      })
    },

    mountToTarget () {
      let el
      const target = this.targetEl

      if (typeof target === 'string') {
        el = document.querySelector(this.targetEl)
      } else {
        el = target
      }

      const attributes = extractAttributes(el)

      if (el) {
        const target = new Vue({
          ...Target,
          parent: this,
          propsData: {
            name: this.to,
            tag: el.tagName,
            attributes,
          },
        })
        target.$mount(el)
        this.mountedComp = target
      } else {
        console.warn('[vue-portal]: The specified targetEl ' + this.targetEl + ' was not found')
      }
    },
    destroy () {
      console.log('Destroying')
      this.clear()
      if (this.mountedComp) {
        this.mountedComp.$destroy()
      }
    },
  },

  render (h) {
    const children = this.$slots.default || []
    const Tag = this.tag
    if (children.length && this.disabled) {
      return children.length <= 1 && this.slim
        ? children[0]
        : (<Tag>{children}</Tag>)
    } else {
      return (<Tag class={'v-portal'} style={'display: none'} key={'v-portal-placeholder'}/>)
      // h(this.tag, { class: { 'v-portal': true }, style: { display: 'none' }, key: 'v-portal-placeholder' })
    }
  },
}
