import * as core from '@actions/core'

import {kubeconform} from './run.js'

kubeconform().catch(core.setFailed)
