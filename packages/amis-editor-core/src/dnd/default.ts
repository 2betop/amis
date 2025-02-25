/**
 * 默认的拖拽模式实现。
 */
import {animation} from 'amis';
import findIndex from 'lodash/findIndex';
import {EditorDNDManager} from '.';
import {renderThumbToGhost} from '../component/factory';
import {EditorNodeType} from '../store/node';
import {translateSchema} from '../util';
import {DNDModeInterface} from './interface';

export class DefaultDNDMode implements DNDModeInterface {
  readonly dndContainer: HTMLElement; // 记录当前拖拽区域
  dropOn?: string;
  dropPosition?: 'top' | 'bottom' | 'left' | 'right';
  constructor(readonly dnd: EditorDNDManager, readonly region: EditorNodeType) {
    // 初始化时，默认将元素所在区域设置为当前拖拽区域
    this.dndContainer = this.dnd.store
      .getDoc()
      .querySelector(
        `[data-region="${region.region}"][data-region-host="${region.id}"]`
      ) as HTMLElement;
  }

  layoutInfo: LayoutInfo | null = null;

  /**
   * 记录上次交换时的鼠标位置。
   */
  exchangeX: number = 0;
  exchangeY: number = 0;

  /**
   * 首次拖入，把 ghost 插入进来。让用户有个直观感受。
   * @param e
   * @param ghost
   */
  enter(e: DragEvent, ghost: HTMLElement) {
    ghost.innerHTML = '';
    ghost.classList.add('use-indicator');

    const layoutInfo = new LayoutDetector(this.dndContainer).detect();
    this.layoutInfo = layoutInfo;

    ghost.style.cssText =
      'width: var(--ae-DragGhost-size); height: var(--ae-DragGhost-size);';
    this.dndContainer.appendChild(ghost);
    this.over(e, ghost);
  }

  /**
   * 拖出去了，就移除 ghost
   * @param e
   * @param ghost
   */
  leave(e: DragEvent, ghost: HTMLElement) {
    this.layoutInfo = null;
    ghost.classList.remove('use-indicator');
    this.dndContainer.removeChild(ghost);
  }

  over(e: DragEvent, ghost: HTMLElement) {
    const target = this.getTarget(e);
    const wrapper = this.dndContainer;

    if (target) {
      const dropPosition = this.detectDropPosition(e, target);
      this.updateIndicator(
        ghost,
        wrapper,
        target,
        this.reductionPosition(dropPosition, this.layoutInfo?.isHorizontal)
      );
    } else if (!this.dropOn) {
      // 拖入了某个区域上
      const dropPosition = this.detectDropPosition(e, wrapper);
      const children = this.getChildren(wrapper);

      if (!children.length) {
        const placeholder = wrapper.querySelector('.ae-Region-placeholder');
        if (placeholder) {
          this.updateIndicator(
            ghost,
            wrapper,
            placeholder as HTMLElement,
            dropPosition
          );
        } else {
          // 当没有孩子时，高亮在中间
          const layoutInfo = this.layoutInfo!;
          const rect = wrapper.getBoundingClientRect();
          ghost.style.cssText += `
            left: ${layoutInfo.isHorizontal ? '50%' : '0'};
            top: ${layoutInfo.isHorizontal ? '0' : '50%'};
            width: ${
              layoutInfo.isHorizontal
                ? 'var(--ae-DragGhost-size)'
                : `${rect.width}px`
            };
            height: ${
              layoutInfo.isHorizontal
                ? `${rect.height}px`
                : 'var(--ae-DragGhost-size)'
            };
          `;
        }
        return;
      }
      this.updateIndicator(
        ghost,
        wrapper,
        children[
          dropPosition === 'top' || dropPosition === 'left'
            ? 0
            : children.length - 1
        ] as HTMLElement,
        this.reductionPosition(dropPosition, this.layoutInfo?.isHorizontal)
      );
    }
  }

  /**
   * 返回个相对位置，如果没有数据会插入到结尾。
   */
  getDropBeforeId() {
    if (!this.dropOn) {
      return;
    }

    if (this.dropPosition === 'top' || this.dropPosition === 'left') {
      return this.dropOn;
    }

    const children = this.getChildren(this.dndContainer);
    const idx = children.findIndex(
      item => item.getAttribute('data-editor-id') === this.dropOn
    );
    if (idx !== -1 && children[idx + 1]) {
      return children[idx + 1].getAttribute('data-editor-id')!;
    }

    return;
  }

  /**
   * 获取当时拖动到了哪个节点上面。
   */
  getTarget(e: DragEvent) {
    let target = (e.target as HTMLElement).closest(
      '[data-editor-id]:not(.ae-is-draging)'
    ) as HTMLElement;

    while (target) {
      const region = target.parentElement?.closest('[data-region]');

      if (region === this.dndContainer) {
        const renderer = target.getAttribute('data-renderer');
        if (renderer === 'grid') {
          // grid 组件中的分栏的子栏也可以拖入 选中分栏组件同级组件拖动时有问题 兼容一下
          return target.parentElement;
        } else {
          return target;
        }
      }

      target =
        (target.parentElement?.closest(
          '[data-editor-id]:not(.ae-is-draging)'
        ) as HTMLElement) || null;
    }

    return null;
  }

  /**
   * 获取区域的直接孩子，因为有时候会在孩子的孩子里面。
   * 但是插入 ghost 的相对位置，insertBefore 只能是当前孩子。
   * @param dom
   * @param descend
   */
  getChild(dom: HTMLElement, descend: HTMLElement) {
    let child = descend;

    while (child) {
      if (child.parentElement === dom) {
        break;
      }

      child = child.parentElement!;
    }

    return child;
  }

  // 获取直接孩子，剔除掉间接孩子
  getChildren(region: HTMLElement): Array<HTMLElement> {
    const indirectChildren = Array.from(
      region.querySelectorAll(':scope [data-editor-id] [data-editor-id]')
    );
    return Array.from(
      region.querySelectorAll('[data-editor-id]:not(.ae-is-draging)')
    ).filter(item => !indirectChildren.includes(item)) as any;
  }

  detectDropPosition(
    event: DragEvent,
    dropTarget: HTMLElement
  ): 'top' | 'bottom' | 'left' | 'right' {
    const rect = dropTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 计算相对位置（百分比）
    const relativeX = x / rect.width;
    const relativeY = y / rect.height;

    // 判断位置（上、下、左、右）
    if (relativeY < 0.25) return 'top';
    if (relativeY > 0.75) return 'bottom';
    if (relativeX < 0.5) return 'left';
    return 'right';
  }

  reductionPosition(
    position: 'top' | 'bottom' | 'left' | 'right',
    isHorizontal?: boolean
  ) {
    const left = position === 'left' || position === 'top';
    return isHorizontal ? (left ? 'left' : 'right') : left ? 'top' : 'bottom';
  }

  updateIndicator(
    ghost: HTMLElement,
    container: HTMLElement,
    target: HTMLElement,
    dropPosition: 'top' | 'bottom' | 'left' | 'right'
  ) {
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    ghost.style.cssText = `width: ${
      dropPosition === 'left' || dropPosition === 'right'
        ? 'var(--ae-DragGhost-size);'
        : targetRect.width
    }px; height: ${
      dropPosition === 'top' || dropPosition === 'bottom'
        ? 'var(--ae-DragGhost-size);'
        : targetRect.height
    }px; left: ${
      dropPosition === 'right'
        ? targetRect.right - containerRect.left
        : targetRect.left - containerRect.left
    }px; top: ${
      dropPosition === 'bottom'
        ? targetRect.bottom - containerRect.top
        : targetRect.top - containerRect.top
    }px; `;

    this.dropOn = target.getAttribute('data-editor-id')!;
    this.dropPosition = dropPosition;
  }

  /**
   * 销毁
   */
  dispose() {
    delete this.dropOn;
    delete this.dropPosition;
  }
}

interface LayoutInfo {
  type: 'flex' | 'grid' | 'block';
  isHorizontal?: boolean;
  isWrapped?: boolean;
  hasColumns?: boolean;
}

class LayoutDetector {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  detectByStyle(): LayoutInfo {
    const win = this.container.ownerDocument.defaultView || window;
    const style = win.getComputedStyle(this.container);
    const display = style.display;

    switch (display) {
      case 'flex':
      case 'inline-flex':
        return this.detectFlexAlignment(style);
      case 'grid':
      case 'inline-grid':
        return this.detectGridAlignment(style);
      default:
        return this.detectBlockAlignment();
    }
  }

  detectFlexAlignment(style: CSSStyleDeclaration): LayoutInfo {
    const direction = style.flexDirection;
    const wrap = style.flexWrap;

    return {
      type: 'flex',
      isHorizontal: direction.includes('row'),
      isWrapped: wrap !== 'nowrap'
    };
  }

  detectGridAlignment(style: CSSStyleDeclaration): LayoutInfo {
    const autoFlow = style.gridAutoFlow;
    const templateColumns = style.gridTemplateColumns;

    return {
      type: 'grid',
      isHorizontal: autoFlow.includes('column'),
      hasColumns: templateColumns !== 'none'
    };
  }

  detectBlockAlignment(): LayoutInfo {
    const children = Array.from(this.container.children).filter(item =>
      item.matches('[data-editor-id]')
    );
    if (!children.length) {
      return {type: 'block', isHorizontal: false};
    } else if (children.length === 1) {
      const rect = this.container.getBoundingClientRect();
      const childRect = children[0].getBoundingClientRect();

      return {
        type: 'block',
        isHorizontal:
          childRect.height / rect.height > childRect.width / rect.width
      };
    }

    const rect1 = children[0].getBoundingClientRect();
    const rect2 = children[1].getBoundingClientRect();

    return {
      type: 'block',
      isHorizontal:
        Math.abs(rect2.left - rect1.left) > Math.abs(rect2.top - rect1.top)
    };
  }

  detect(): LayoutInfo {
    return this.detectByStyle();
  }
}
