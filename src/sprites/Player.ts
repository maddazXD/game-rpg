import Phaser from 'phaser';

import { key } from '../constants';

enum Animation {
  Left = 'player_left',
  Right = 'player_right',
  Up = 'player_up',
  Down = 'player_down',
}

type Cursors = Record<
  'w' | 'a' | 's' | 'd' | 'up' | 'left' | 'down' | 'right' | 'space',
  Phaser.Input.Keyboard.Key
>;

const Velocity = {
  Horizontal: 175,
  Vertical: 175,
} as const;

export class Player extends Phaser.Physics.Arcade.Sprite {
  body!: Phaser.Physics.Arcade.Body;
  cursors: Cursors;
  selector: Phaser.Physics.Arcade.StaticBody;

  // Virtual joystick properties
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickActive = false;
  private joystickPointerId: number | null = null;
  private joystickStartX = 0;
  private joystickStartY = 0;
  private joystickDeltaX = 0;
  private joystickDeltaY = 0;
  private readonly JOYSTICK_RADIUS = 60;
  private readonly JOYSTICK_THUMB_RADIUS = 30;
  private readonly JOYSTICK_BASE_X = 100;
  private readonly JOYSTICK_BASE_Y_OFFSET = 120; // dari bawah layar

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture = key.atlas.player,
    frame = 'misa-front',
  ) {
    super(scene, x, y, texture, frame);

    scene.add.existing(this);
    scene.physics.world.enable(this);
    this.setSize(32, 42).setOffset(0, 22);
    this.setCollideWorldBounds(true);
    scene.cameras.main.startFollow(this);
    scene.cameras.main.setZoom(1);

    this.cursors = this.createCursorKeys();
    this.createAnimations();
    this.selector = scene.physics.add.staticBody(x - 8, y + 32, 16, 16);

    // Buat virtual joystick kalau device touch
    if (this.scene.sys.game.device.input.touch) {
      this.createVirtualJoystick();
    }
  }

  private createVirtualJoystick() {
    const scene = this.scene;
    const baseY = scene.cameras.main.height - this.JOYSTICK_BASE_Y_OFFSET;

    // Base joystick (lingkaran luar, transparan)
    this.joystickBase = scene.add
      .circle(
        this.JOYSTICK_BASE_X,
        baseY,
        this.JOYSTICK_RADIUS,
        0x000000,
        0.3,
      )
      .setScrollFactor(0)
      .setDepth(100)
      .setStrokeStyle(3, 0xffffff, 0.6);

    // Thumb joystick (lingkaran dalam yang digeser)
    this.joystickThumb = scene.add
      .circle(
        this.JOYSTICK_BASE_X,
        baseY,
        this.JOYSTICK_THUMB_RADIUS,
        0xffffff,
        0.6,
      )
      .setScrollFactor(0)
      .setDepth(101);

    // Touch events
    scene.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer) => {
        // Hanya aktifkan kalau sentuhan di kiri layar
        if (pointer.x < scene.cameras.main.width / 2) {
          this.joystickActive = true;
          this.joystickPointerId = pointer.id;
          this.joystickStartX = pointer.x;
          this.joystickStartY = pointer.y;
          this.joystickBase.setPosition(pointer.x, pointer.y);
          this.joystickThumb.setPosition(pointer.x, pointer.y);
        }
      },
    );

    scene.input.on(
      'pointermove',
      (pointer: Phaser.Input.Pointer) => {
        if (this.joystickActive && pointer.id === this.joystickPointerId) {
          const dx = pointer.x - this.joystickStartX;
          const dy = pointer.y - this.joystickStartY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDist = this.JOYSTICK_RADIUS;

          if (distance <= maxDist) {
            this.joystickThumb.setPosition(pointer.x, pointer.y);
            this.joystickDeltaX = dx;
            this.joystickDeltaY = dy;
          } else {
            // Batasi di tepi lingkaran
            const angle = Math.atan2(dy, dx);
            this.joystickThumb.setPosition(
              this.joystickStartX + Math.cos(angle) * maxDist,
              this.joystickStartY + Math.sin(angle) * maxDist,
            );
            this.joystickDeltaX = Math.cos(angle) * maxDist;
            this.joystickDeltaY = Math.sin(angle) * maxDist;
          }
        }
      },
    );

    scene.input.on(
      'pointerup',
      (pointer: Phaser.Input.Pointer) => {
        if (pointer.id === this.joystickPointerId) {
          this.joystickActive = false;
          this.joystickPointerId = null;
          this.joystickDeltaX = 0;
          this.joystickDeltaY = 0;
          // Reset thumb ke posisi base
          this.joystickThumb.setPosition(
            this.joystickBase.x,
            this.joystickBase.y,
          );
        }
      },
    );
  }

  private createCursorKeys() {
    return this.scene.input.keyboard!.addKeys(
      'w,a,s,d,up,left,down,right,space',
    ) as Cursors;
  }

  private createAnimations() {
    const anims = this.scene.anims;

    if (!anims.exists(Animation.Left)) {
      anims.create({
        key: Animation.Left,
        frames: anims.generateFrameNames(key.atlas.player, {
          prefix: 'misa-left-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!anims.exists(Animation.Right)) {
      anims.create({
        key: Animation.Right,
        frames: anims.generateFrameNames(key.atlas.player, {
          prefix: 'misa-right-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!anims.exists(Animation.Up)) {
      anims.create({
        key: Animation.Up,
        frames: anims.generateFrameNames(key.atlas.player, {
          prefix: 'misa-back-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!anims.exists(Animation.Down)) {
      anims.create({
        key: Animation.Down,
        frames: anims.generateFrameNames(key.atlas.player, {
          prefix: 'misa-front-walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  private moveSelector(animation: Animation) {
    const { body, selector } = this;

    switch (animation) {
      case Animation.Left:
        selector.x = body.x - 19;
        selector.y = body.y + 14;
        break;

      case Animation.Right:
        selector.x = body.x + 35;
        selector.y = body.y + 14;
        break;

      case Animation.Up:
        selector.x = body.x + 8;
        selector.y = body.y - 18;
        break;

      case Animation.Down:
        selector.x = body.x + 8;
        selector.y = body.y + 46;
        break;
    }
  }

  // Cek arah joystick dengan threshold
  private get joystickLeft() {
    return this.joystickActive && this.joystickDeltaX < -20;
  }
  private get joystickRight() {
    return this.joystickActive && this.joystickDeltaX > 20;
  }
  private get joystickUp() {
    return this.joystickActive && this.joystickDeltaY < -20;
  }
  private get joystickDown() {
    return this.joystickActive && this.joystickDeltaY > 20;
  }

  update() {
    const { anims, body, cursors } = this;
    const prevVelocity = body.velocity.clone();

    body.setVelocity(0);

    // Horizontal movement — keyboard ATAU joystick
    switch (true) {
      case cursors.left.isDown:
      case cursors.a.isDown:
      case this.joystickLeft:
        body.setVelocityX(-Velocity.Horizontal);
        break;

      case cursors.right.isDown:
      case cursors.d.isDown:
      case this.joystickRight:
        body.setVelocityX(Velocity.Horizontal);
        break;
    }

    // Vertical movement — keyboard ATAU joystick
    switch (true) {
      case cursors.up.isDown:
      case cursors.w.isDown:
      case this.joystickUp:
        body.setVelocityY(-Velocity.Vertical);
        break;

      case cursors.down.isDown:
      case cursors.s.isDown:
      case this.joystickDown:
        body.setVelocityY(Velocity.Vertical);
        break;
    }

    body.velocity.normalize().scale(Velocity.Horizontal);

    switch (true) {
      case cursors.left.isDown:
      case cursors.a.isDown:
      case this.joystickLeft:
        anims.play(Animation.Left, true);
        this.moveSelector(Animation.Left);
        break;

      case cursors.right.isDown:
      case cursors.d.isDown:
      case this.joystickRight:
        anims.play(Animation.Right, true);
        this.moveSelector(Animation.Right);
        break;

      case cursors.up.isDown:
      case cursors.w.isDown:
      case this.joystickUp:
        anims.play(Animation.Up, true);
        this.moveSelector(Animation.Up);
        break;

      case cursors.down.isDown:
      case cursors.s.isDown:
      case this.joystickDown:
        anims.play(Animation.Down, true);
        this.moveSelector(Animation.Down);
        break;

      default:
        anims.stop();

        switch (true) {
          case prevVelocity.x < 0:
            this.setTexture(key.atlas.player, 'misa-left');
            this.moveSelector(Animation.Left);
            break;

          case prevVelocity.x > 0:
            this.setTexture(key.atlas.player, 'misa-right');
            this.moveSelector(Animation.Right);
            break;

          case prevVelocity.y < 0:
            this.setTexture(key.atlas.player, 'misa-back');
            this.moveSelector(Animation.Up);
            break;

          case prevVelocity.y > 0:
            this.setTexture(key.atlas.player, 'misa-front');
            this.moveSelector(Animation.Down);
            break;
        }
    }
  }
}
