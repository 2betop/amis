import {registerGlobalVarPanel} from './GlobalVarManagerPanel';
import React from 'react';
import {SchemaForm} from 'amis-editor-core';

/**
 * 注册基本变量设置面板
 */
registerGlobalVarPanel('builtin', {
  title: '基础变量',
  description: '系统内置的全局变量',
  component: function () {
    return <div>233</div>;
  }
});

const advancedControls = [
  {
    type: 'input-text',
    name: 'name',
    label: '变量名',
    required: true
  },
  {
    type: 'input-text',
    name: 'value',
    label: '变量值',
    required: true
  }
];
registerGlobalVarPanel('advanced', {
  title: '高级变量',
  description: '',
  component: (props: any) => (
    <SchemaForm
      mode="horizontal"
      horizontal={{
        left: 2
      }}
      {...props}
      body={advancedControls}
    />
  ),
  validate(value) {
    console.log(value);
    // throw new Error('不合法');
  }
});
