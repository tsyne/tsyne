// TSYNE: Replaced Vite static PNG imports with trine loadTexture().
// TSYNE: MeshPhongMaterial instead of MeshStandardMaterial (saves texture units).
// TSYNE: Made construction async via static create() factory.

import * as THREE_MODULE from 'three'
import * as path from 'path'
import { loadTexture } from '../../../../../trine/integration/texture-loader'

const TEXTURE_DIR = path.resolve(__dirname, '../../../src/static/textures/block')

// TSYNE: Accept patched THREE namespace to ensure textures are created with the right classes
async function loadBlockTexture(THREE: typeof THREE_MODULE, filename: string) {
  const tex = await loadTexture(THREE, path.join(TEXTURE_DIR, filename))
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* Original Vite static imports:
import stone from '../../static/textures/block/stone.png'
import coal_ore from '../../static/textures/block/coal_ore.png'
... (15 more imports)
*/

export enum MaterialType {
  grass = 'grass',
  dirt = 'dirt',
  tree = 'tree',
  leaf = 'leaf',
  sand = 'sand',
  // water = 'water',
  stone = 'stone',
  coal = 'coal',
  wood = 'wood',
  diamond = 'diamond',
  quartz = 'quartz',
  glass = 'glass',
  bedrock = 'bedrock'
}

export default class Materials {
  materials: Record<string, any | any[]> = {}

  // TSYNE: Async factory — accepts patched THREE namespace
  // Original constructor loaded textures synchronously via Vite imports
  static async create(THREE: typeof THREE_MODULE = THREE_MODULE): Promise<Materials> {
    const m = new Materials()

    // Load all textures in parallel
    const [
      grassTopTex, grassSideTex, treeTex, treeTopTex, dirtTex,
      stoneTex, coalTex, leafTex, sandTex,
      woodTex, diamondTex, quartzTex, glassTex, bedrockTex
    ] = await Promise.all([
      loadBlockTexture(THREE, 'grass_top_green.png'),
      loadBlockTexture(THREE, 'grass_block_side.png'),
      loadBlockTexture(THREE, 'oak_log.png'),
      loadBlockTexture(THREE, 'oak_log_top.png'),
      loadBlockTexture(THREE, 'dirt.png'),
      loadBlockTexture(THREE, 'stone.png'),
      loadBlockTexture(THREE, 'coal_ore.png'),
      loadBlockTexture(THREE, 'oak_leaves.png'),
      loadBlockTexture(THREE, 'sand.png'),
      loadBlockTexture(THREE, 'oak_planks.png'),
      loadBlockTexture(THREE, 'diamond_block.png'),
      loadBlockTexture(THREE, 'quartz_block_side.png'),
      loadBlockTexture(THREE, 'glass.png'),
      loadBlockTexture(THREE, 'bedrock.png'),
    ])

    m.materials = {
      grass: [
        new THREE.MeshPhongMaterial({ map: grassSideTex }),
        new THREE.MeshPhongMaterial({ map: grassSideTex }),
        new THREE.MeshPhongMaterial({ map: grassTopTex }),
        new THREE.MeshPhongMaterial({ map: dirtTex }),
        new THREE.MeshPhongMaterial({ map: grassSideTex }),
        new THREE.MeshPhongMaterial({ map: grassSideTex })
      ],
      dirt: new THREE.MeshPhongMaterial({ map: dirtTex }),
      sand: new THREE.MeshPhongMaterial({ map: sandTex }),
      tree: [
        new THREE.MeshPhongMaterial({ map: treeTex }),
        new THREE.MeshPhongMaterial({ map: treeTex }),
        new THREE.MeshPhongMaterial({ map: treeTopTex }),
        new THREE.MeshPhongMaterial({ map: treeTopTex }),
        new THREE.MeshPhongMaterial({ map: treeTex }),
        new THREE.MeshPhongMaterial({ map: treeTex })
      ],
      leaf: new THREE.MeshPhongMaterial({
        map: leafTex,
        color: new THREE.Color(0, 1, 0),
        transparent: true
      }),
      stone: new THREE.MeshPhongMaterial({ map: stoneTex }),
      coal: new THREE.MeshPhongMaterial({ map: coalTex }),
      wood: new THREE.MeshPhongMaterial({ map: woodTex }),
      diamond: new THREE.MeshPhongMaterial({ map: diamondTex }),
      quartz: new THREE.MeshPhongMaterial({ map: quartzTex }),
      glass: new THREE.MeshPhongMaterial({
        map: glassTex,
        transparent: true
      }),
      bedrock: new THREE.MeshPhongMaterial({ map: bedrockTex })
    }

    return m
  }

  get = (
    type: MaterialType
  ): any | any[] => {
    return this.materials[type]
  }
}
