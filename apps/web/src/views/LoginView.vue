<script setup lang="ts">
import { CircleCheck, ClipboardList, Eye, EyeOff, LoaderCircle, Users, Wrench } from '@lucide/vue'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AlertBox from '../components/AlertBox.vue'
import FormField from '../components/FormField.vue'
import { signIn } from '../session'
import { errorMessage } from '../utils/format'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await signIn(email.value, password.value)
    await router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth">
    <aside class="panel" aria-hidden="true">
      <div class="brand"><span class="mark"><Wrench :size="18" :stroke-width="2.5" /></span>Maintenance Log</div>
      <div>
        <p class="tagline">Report it.<br />Review it.<br />Fix it.</p>
        <ul>
          <li><ClipboardList :size="18" />Operators raise a request when a machine has a problem</li>
          <li><CircleCheck :size="18" />Supervisors approve or reject, with a full history</li>
          <li><Users :size="18" />Admins manage people and records</li>
        </ul>
      </div>
    </aside>

    <section class="form-side">
      <form class="login" @submit.prevent="submit">
        <div class="mobile-brand"><span class="mark"><Wrench :size="16" :stroke-width="2.5" aria-hidden="true" /></span>Maintenance Log</div>
        <h1>Sign in</h1>
        <p class="muted lead">Use the account provided by your administrator.</p>

        <AlertBox v-if="error">{{ error }}</AlertBox>

        <FormField label="Email" v-slot="f">
          <input :id="f.id" v-model="email" type="email" autocomplete="username" required autofocus />
        </FormField>

        <FormField label="Password" v-slot="f">
          <div class="password">
            <input :id="f.id" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required />
            <button
              type="button"
              class="toggle"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="18" aria-hidden="true" />
              <Eye v-else :size="18" aria-hidden="true" />
            </button>
          </div>
        </FormField>

        <button class="btn btn-primary submit" :disabled="busy">
          <LoaderCircle v-if="busy" class="spin" :size="16" aria-hidden="true" />
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.auth { display: grid; grid-template-columns: minmax(320px, 5fr) 6fr; min-height: 100dvh; }

/* The brand panel keeps its own dark colours in both themes, so it is not tokenised. */
.panel {
  display: flex; flex-direction: column; justify-content: space-between; gap: 2rem; padding: 2.5rem;
  color: #e6f0ea; background: radial-gradient(120% 90% at 0% 0%, #1d5a36 0%, #0f2a1b 60%);
}
.brand { display: flex; align-items: center; gap: 0.7rem; font-weight: 600; font-size: 1.05rem; }
.mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; background: #22c55e; color: #052e16; }
.tagline { margin-bottom: 1.75rem; font-size: 2.4rem; font-weight: 600; line-height: 1.15; letter-spacing: -0.02em; }
ul { display: grid; gap: 0.85rem; margin: 0; padding: 0; list-style: none; color: #b9d0c2; }
li { display: flex; gap: 0.7rem; align-items: flex-start; }
li svg { margin-top: 3px; color: #4ade80; }

.mobile-brand { display: none; align-items: center; gap: 0.6rem; margin-bottom: 1.5rem; font-weight: 600; }
.mobile-brand .mark { width: 30px; height: 30px; border-radius: 8px; background: var(--primary); color: var(--on-primary); }
.form-side { display: grid; place-items: center; padding: 2rem 1.25rem; }
.login { width: 100%; max-width: 380px; }
.lead { margin: 0.25rem 0 1.5rem; }
.password { position: relative; }
.password input { padding-right: 2.9rem; }
.toggle {
  position: absolute; top: 0; right: 0; display: grid; place-items: center; width: 40px; height: 100%; min-height: 40px;
  color: var(--text-muted); background: transparent; border: 0; border-radius: var(--radius-sm); cursor: pointer;
}
.toggle:hover { color: var(--text); }
.submit { width: 100%; margin-top: 0.4rem; }

@media (max-width: 860px) {
  .auth { grid-template-columns: 1fr; }
  .panel { display: none; }
  .mobile-brand { display: flex; }
}
</style>
