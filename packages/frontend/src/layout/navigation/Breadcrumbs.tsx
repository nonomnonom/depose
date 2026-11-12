import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@depose/ui/components/breadcrumb';

import type { Breadcrumb as BreadcrumbEntry } from './navigationLogic';

export function Breadcrumbs({ items }: { items: BreadcrumbEntry[] }): React.ReactNode {
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem className="min-w-0">
                {last || !item.href ? (
                  <BreadcrumbPage className="truncate">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink className="truncate" render={<Link to={item.href} />}>
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
