import React from 'react';
import {GlobalVariableItem} from 'amis-core';
import {PanelProps} from 'amis-editor-core';
import {observer} from 'mobx-react';
import {Button} from 'amis-ui';

type PanelComponentProps = {
  value: GlobalVariableItem;
  onChange: (value: GlobalVariableItem) => void;
};

/**
 * 全局变量管理面板
 */
export interface globalVarPanel {
  /**
   * 变量类型，不通的变量类型配置面板不一样
   */
  type: string | 'builtin';

  /**
   * 变量类型标题
   */
  title: string;

  /**
   * 变量类型描述
   */
  description?: string;

  renderBrief?: (value: GlobalVariableItem) => React.ReactNode;

  /**
   * 验证数据合法性
   * @param value
   * @returns
   */
  validate?: (value: GlobalVariableItem) => string | void;

  /**
   * 配置面板
   */
  component?: React.ComponentType<PanelComponentProps>;
  getComponent?: () => Promise<React.ComponentType<PanelComponentProps>>;
}

const globalVarPanels: Array<globalVarPanel> = [];

export function registerGlobalVarPanel(
  type: string,
  panel: Omit<globalVarPanel, 'type'>
) {
  globalVarPanels.push({...panel, type});
}

export interface GlobalVarMangerProps extends PanelProps {}

export const GlobalVarManger = observer((props: GlobalVarMangerProps) => {
  const {store} = props;

  return (
    <div className="ae-GlobalVarManager">
      {store.globalVariables.length ? (
        <div className="ae-GlobalVarManager-empty">暂无全局变量</div>
      ) : (
        <ul>
          {store.globalVariables.map((item, index) => {
            return (
              <div key={index} className="global-var-item">
                <div className="global-var-item-title">{item.label}</div>
                <div className="global-var-item-value">{item.value}</div>
              </div>
            );
          })}
        </ul>
      )}
      <Button block>添加</Button>
    </div>
  );
});

export function GlobalVarManagerPanel(props: any) {
  return (
    <div className="ae-GlobalVarPanel">
      <div className="panel-header">全局变量</div>
      <hr className="margin-top" />
      <GlobalVarManger {...props} />
    </div>
  );
}
