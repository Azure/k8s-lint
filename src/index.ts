import * as core from '@actions/core'

import {kubeconform} from './run'

kubeconform().catch(core.setFailed)
